import express from 'express';
import multer from 'multer';
import { google, drive_v3 } from 'googleapis';
import { GoogleGenAI } from '@google/genai';
import cors from 'cors';
import dotenv from 'dotenv';
import stream from 'stream';
import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';
import nodemailer from 'nodemailer';

// Override is needed here because the platform environment might be injecting
// an incorrect legacy string into the memory space (e.g. 'pepo_1759').
dotenv.config({ override: true });

// Helper to sanitize and format Google Private Key
const formatPrivateKey = (key: string | undefined): string | null => {
  if (!key || typeof key !== 'string') return null;
  
  let content = key.trim();
  
  // 1. Handle JSON input (if user pasted the whole service-account.json)
  if (content.startsWith('{')) {
    try {
      const parsed = JSON.parse(content);
      if (parsed.private_key) content = parsed.private_key;
    } catch {
      // ignore
    }
  }

  // 2. Clean up quotes and handles literal \n
  content = content.replace(/^["']|["']$/g, '');
  
  // 3. Handle escaped newlines (standard fix for env vars)
  content = content.replace(/\\n/g, '\n');

  // 4. If it already has headers and newlines, it's likely good
  if (content.includes('-----BEGIN') && content.includes('-----END') && content.includes('\n')) {
    return content;
  }

  // 5. Reconstruction path (safest for raw base64 or malformed PEM)
  const markerType = content.includes('RSA PRIVATE KEY') ? 'RSA PRIVATE KEY' : 'PRIVATE KEY';
  
  const body = content
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/[^A-Za-z0-9+/=_-]/g, '')
    .replace(/-/g, '+')
    .replace(/_/g, '/');
    
  if (body.length < 100) return null;

  const chunks = body.match(/.{1,64}/g) || [];
  return `-----BEGIN ${markerType}-----\n${chunks.join('\n')}\n-----END ${markerType}-----\n`;
};

// Prevent unhandled promise rejections and uncaught exceptions from crashing the server
process.on('unhandledRejection', (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
process.on('uncaughtException', (error) => {
  console.error("Uncaught Exception thrown:", error);
});

// Initialize Firebase Admin
const startMsg = `Server process started at ${new Date().toISOString()}\n`;
console.log(startMsg.trim());
try {
  fs.writeFileSync('server-debug.log', startMsg);
} catch { 
  // ignore
}

try {
  const clientEmailStr = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL || '').trim();
  const privateKeyStr = formatPrivateKey(process.env.GOOGLE_PRIVATE_KEY);
  const dbId = 'ai-studio-ae68b566-d554-42ad-b43d-b3b37ee908c4'; // Hardcoding to avoid async import in CommonJS or weird ES module syntax in try block

  if (clientEmailStr && privateKeyStr) {
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'tveta-quality',
          clientEmail: clientEmailStr,
          privateKey: privateKeyStr,
        }),
        // @ts-expect-error databaseId
        databaseId: dbId
      });
      const msg = 'Firebase Admin initialized successfully with Service Account\n';
      console.log(msg.trim());
      fs.appendFileSync('server-debug.log', msg);
    }
  } else {
    if (admin.apps.length === 0) {
      admin.initializeApp({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'tveta-quality',
        // @ts-expect-error databaseId
        databaseId: dbId
      });
      const msg = 'Firebase Admin initialized with default project ID (tveta-quality)\n';
      console.log(msg.trim());
      fs.appendFileSync('server-debug.log', msg);
    }
  }
} catch (error) {
  const msg = `Firebase Admin initialization error: ${(error as Error).message}\n`;
  console.warn(msg.trim());
  fs.appendFileSync('server-debug.log', msg);
}

const app = express();

// Logging middleware - TOP
app.use((req, res, next) => {
  // Only log API requests to avoid noisy asset logs triggering false positive error detectors
  if (req.url.startsWith('/api')) {
    const logMsg = `${new Date().toISOString()} - ${req.method} ${req.url}\n`;
    console.log(logMsg.trim());
    try {
      fs.appendFileSync('server-debug.log', logMsg);
    } catch {
      // ignore
    }
  }
  next();
});

app.use(cors());

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const upload = multer({ storage: multer.memoryStorage() });

// Helper to get Google Drive configuration
const getDriveConfig = async () => {
    const envEmail = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim();
    const envPrivateKey = formatPrivateKey(process.env.GOOGLE_PRIVATE_KEY);
    const envFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (envEmail && envPrivateKey) {
        return {
            clientEmail: envEmail,
            privateKey: envPrivateKey,
            folderId: envFolderId
        };
    }

    try {
        if (admin.apps.length > 0) {
            const doc = await admin.firestore().collection('system_config').doc('drive').get();
            if (doc.exists) {
                const data = doc.data();
                if (data && data.clientEmail && data.privateKey) {
                    return {
                        clientEmail: data.clientEmail as string,
                        privateKey: data.privateKey as string,
                        folderId: (data.folderId as string) || ''
                    };
                }
            }
        }
    } catch (e: unknown) {
        // Suppress warning if it's a permission denied error from default credentials
        const err = e as { code?: number; message?: string };
        if (err.code === 7 || err.message?.includes('PERMISSION_DENIED')) {
            console.debug("Drive config not accessible in Firestore (permission denied), using defaults.");
        } else {
            console.warn("Could not fetch Drive config from Firestore:", err.message);
        }
    }
    
    return {
        clientEmail: '',
        privateKey: null,
        folderId: ''
    };
};

// Google Drive Auth Setup
const getDriveService = async (accessToken?: string) => {
  if (accessToken) {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    return google.drive({ version: 'v3', auth: oauth2Client });
  }

  const config = await getDriveConfig();
  const clientEmail = config.clientEmail;
  const privateKey = config.privateKey;

  const missing = [];
  if (!clientEmail) missing.push('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  if (!privateKey) missing.push('GOOGLE_PRIVATE_KEY');

  if (missing.length > 0) {
    throw new Error(`Google Service Account credentials are not configured. Missing: ${missing.join(', ')}.`);
  }

  const authClient = new google.auth.JWT({
    email: clientEmail!.trim(),
    key: privateKey || undefined,
    scopes: ['https://www.googleapis.com/auth/drive']
  });

  return google.drive({ version: 'v3', auth: authClient });
};

const formatDriveError = (error: unknown, projectNumFallback = '826481498410') => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyErr = error as any;
  let message = anyErr.message || 'Unknown error';
  
  if (anyErr.response && anyErr.response.data && anyErr.response.data.error) {
    message = anyErr.response.data.error.message || message;
  }

  if (message.includes('Google Drive API has not been used in project') || message.includes('disabled')) {
    const match = message.match(/project (\d+)/);
    const projectNum = match ? match[1] : projectNumFallback;
    return `ميزة Google Drive API غير مفعلة في حساب Google Cloud الخاص بك لهذا المشروع (مشروع رقم ${projectNum}). يرجى تفعيلها بالدخول على الرابط التالي لتتمكن من استخدام النسخ الاحتياطي: https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=${projectNum}`;
  }
  
  if (message.includes('not found or not accessible') || message.includes('not found') || message.includes('not accessible')) {
    return 'المجلد المحدد غير موجود أو لا يملك حساب جوجل أو الحساب المساعد (Service Account) صلاحية الوصول إليه. يرجى التأكد من صحة معرف المجلد ومشاركته مع حسابك.';
  }
  
  if (message.includes('storage quota') || message.includes('quota')) {
    return 'خطأ الحصة التخزينية (Drive Quota Error): حسابات الخدمة (Service Accounts) لا تملك مساحة تخزينية خاصة بها للحسابات الشخصية (@gmail.com).\n\n' +
           '💡 لحل المشكلة، لديك خياران:\n' +
           '1️⃣ (الحل الأسهل والموصى به): اذهب إلى صفحة "مدير الملفات" في النظام، وانقر على زر "ربط بحساب Google" لتسجيل الدخول مباشرة بحسابك الشخصي. سيقوم النظام بعد ذلك برفع وحفظ الملفات في حسابك الشخصي مباشرةً باستخدام مساحتك التخزينية الخاصة.\n' +
           '2️⃣ (لمستخدمي Google Workspace): قم بإنشاء "مساحة تخزين مشتركة" (Shared Drive)، وقم بإضافة البريد الإلكتروني الخاص بحساب الخدمة (Service Account) كعضو بمستوى "مساهم" (Contributor) أو أعلى، ثم ضع معرف المجلد المشترك في إعدادات النظام.';
  }

  return message;
};

// Helper to resolve folder by ID or Name
const resolveFolderId = async (drive: drive_v3.Drive, folderQueryStr: string | undefined): Promise<string> => {
  if (!folderQueryStr || folderQueryStr === 'root') return 'root';
  
  // If it's clearly an ID (26+ characters of ID type)
  const isPotentialId = /^[a-zA-Z0-9_-]{26,}$/.test(folderQueryStr) && !folderQueryStr.includes('QUALITY_MANAGEMENT');

  if (isPotentialId) {
      try {
          await drive.files.get({ fileId: folderQueryStr, fields: 'id', supportsAllDrives: true });
          return folderQueryStr;
      } catch (err: unknown) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const anyErr = err as any;
          console.warn(`Provided ID ${folderQueryStr} is not accessible.`, anyErr.message);
          // If it was explicitly an ID, we shouldn't try to use it as a name later if it was meant to be the root storage
          let errorMsg = anyErr.message;
          if (anyErr.response && anyErr.response.data && anyErr.response.data.error) {
              errorMsg = anyErr.response.data.error.message || errorMsg;
          }
          throw new Error(`Folder ID ${folderQueryStr} not found or not accessible by the Service Account. Error: ${errorMsg}`);
      }
  }

  try {
      const response = await drive.files.list({
          q: `name='${folderQueryStr}' and mimeType='application/vnd.google-apps.folder' and trashed=false`, // search globally
          fields: 'files(id, name, owners)',
          includeItemsFromAllDrives: true,
          supportsAllDrives: true,
      });
      if (response.data.files && response.data.files.length > 0) {
          // Prefer folder shared with SA (me: false)
          const sharedFolder = response.data.files.find((f: drive_v3.Schema$File) => f.owners && !f.owners.some((o: drive_v3.Schema$User) => o.me));
          if (sharedFolder) return sharedFolder.id!;
          return response.data.files[0].id!;
      }
      
      throw new Error(`Google Drive Error: Service Accounts do not have personal storage space. Cannot automatically create folder '${folderQueryStr}'. Please create a folder in your personal Drive and share it with the Service Account email as 'Editor'.`);
  } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyErr = error as any;
      console.warn("Could not resolve/create folder by name", anyErr);
      let errorMsg = anyErr.message;
      if (anyErr.response && anyErr.response.data && anyErr.response.data.error) {
          errorMsg = anyErr.response.data.error.message || errorMsg;
      }
      if (errorMsg && errorMsg.includes('storage quota')) {
         throw new Error(`Google Drive Error: Service Accounts do not have personal storage space. Cannot create folder '${folderQueryStr}' in root. Please create a folder in your personal Drive and share it with the Service Account email as 'Editor'.`);
      }
      throw new Error(`Could not resolve or create folder ${folderQueryStr}: ${errorMsg}`);
  }
};

/**
 * Helper to ensure a subfolder path exists under a parent
 * Supports paths like "Visits/Cairo/Location A"
 */
const ensureSubfolderPath = async (drive: drive_v3.Drive, parentId: string, path: string): Promise<string> => {
  const parts = path.split('/').filter(p => p.length > 0);
  let currentParentId = parentId;

  for (const part of parts) {
    const response = await drive.files.list({
      q: `'${currentParentId}' in parents and name='${part}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
    });

    if (response.data.files && response.data.files.length > 0) {
      currentParentId = response.data.files[0].id!;
    } else {
      const newFolder = await drive.files.create({
        requestBody: { name: part, mimeType: 'application/vnd.google-apps.folder', parents: [currentParentId] },
        fields: 'id'
      });
      currentParentId = newFolder.data.id!;
    }
  }

  return currentParentId;
};

// API Routes
app.post('/api/auth/create-user', async (req, res) => {
  try {
    const { email: rawEmail, password: rawPassword, displayName, uid } = req.body;
    if (!rawEmail) return res.status(400).json({ error: 'Email is required' });
    
    const email = rawEmail.trim().toLowerCase();
    const password = rawPassword ? rawPassword.trim() : undefined;
    
    // Check if the request is for a special admin
    const isSpecialAdmin = ['peterfathi2020@gmail.com', 'sayedjica2016@gmail.com'].includes(email.toLowerCase());
    
    // If not a special admin, require an admin token
    if (!isSpecialAdmin) {
        const accessToken = getAccessToken(req);
        if (!accessToken) return res.status(401).json({ error: 'Unauthorized: Missing token' });
        
        try {
            const decodedToken = await admin.auth().verifyIdToken(accessToken);
            // Verify they are an admin
            const userRef = await admin.firestore().collection('users').doc(decodedToken.uid).get();
            const userData = userRef.data();
            if (!userData || (userData.role !== 'admin' && userData.role !== 'sector_manager' && userData.role !== 'gov_manager')) {
                return res.status(403).json({ error: 'Unauthorized: Access denied' });
            }
        } catch {
            return res.status(403).json({ error: 'Unauthorized: Invalid token' });
        }
    }

    const adminRunWithRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 500): Promise<T> => {
        for (let i = 0; i < retries; i++) {
            try {
                return await fn();
            } catch (error: unknown) {
                const errVal = error as { code?: string; message?: string };
                const isNetworkError = 
                    (errVal.code && errVal.code.includes('network')) || 
                    (errVal.message && (
                        errVal.message.includes('network') || 
                        errVal.message.includes('timeout') || 
                        errVal.message.includes('fetch') ||
                        errVal.message.includes('socket') ||
                        errVal.message.includes('request-failed')
                    ));
                if (isNetworkError && i < retries - 1) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2;
                    continue;
                }
                throw error;
            }
        }
        throw new Error('All retries failed');
    };

    let userRecord;
    let findEmailSuccess = false;
    let findUidSuccess = false;
    let existingUser;
    
    if (uid) {
        console.log(`[create-user api] Attempting to find user by UID: ${uid}`);
        try {
            existingUser = await adminRunWithRetry(() => admin.auth().getUser(uid));
            findUidSuccess = true;
            console.log(`[create-user api] Found existing user by UID: ${existingUser.uid}`);
        } catch {
            console.log(`[create-user api] Lookup by UID completed (user is new/not yet created in Auth).`);
        }
    }

    if (!findUidSuccess) {
        console.log(`[create-user api] Attempting to manage admin/user for: ${email}`);
        try {
            existingUser = await adminRunWithRetry(() => admin.auth().getUserByEmail(email));
            findEmailSuccess = true;
            console.log(`[create-user api] Found existing user: ${existingUser.uid}`);
        } catch (getErr: unknown) {
            const err = getErr as { code?: string; message?: string };
            const errStr = (String(err?.code || '') + ' ' + String(err?.message || '') + ' ' + String(getErr || '')).toLowerCase();
            console.log(`[create-user api] Lookup by email completed (user is new/not yet created in Auth).`);
            
            const isNotFoundError = (err?.code === 'auth/user-not-found') || 
                                    errStr.includes('not-found') || 
                                    errStr.includes('not found') ||
                                    errStr.includes('not_found');
            
            const isAlreadyExistsMsg = (err?.code === 'auth/email-already-exists') || 
                                       (err?.code === 'auth/email-already-in-use') || 
                                       errStr.includes('already-exists') || 
                                       errStr.includes('already-in-use') ||
                                       errStr.includes('already exists') || 
                                       errStr.includes('already in use') ||
                                       errStr.includes('already_exists') ||
                                       errStr.includes('already_in_use') ||
                                       errStr.includes('already use');

            if (!isNotFoundError && isAlreadyExistsMsg) {
                findEmailSuccess = true;
                console.log(`[create-user api] User detected as already existing based on lookup error context.`);
            }
        }
    }

    if (findUidSuccess || findEmailSuccess) {
        try {
            const userToUpdate = existingUser || (findUidSuccess ? await adminRunWithRetry(() => admin.auth().getUser(uid)) : await adminRunWithRetry(() => admin.auth().getUserByEmail(email)));
            console.log(`[create-user api] Updating existing user: ${userToUpdate.uid} with optional password & email & displayName`);
            const updateParams: { displayName?: string, password?: string, email?: string } = { displayName };
            if (password) {
                updateParams.password = password;
            }
            if (email && email !== userToUpdate.email) {
                updateParams.email = email;
            }
            userRecord = await adminRunWithRetry(() => admin.auth().updateUser(userToUpdate.uid, updateParams));
            console.log(`[create-user api] Successfully updated existing user: ${userRecord.uid}`);
            res.json({ uid: userRecord.uid });
        } catch (updateErr: unknown) {
            const uErr = updateErr as { message?: string };
            console.error(`[create-user api] Failed updating existing user:`, updateErr);
            res.status(500).json({ error: 'Failed to update existing user: ' + (uErr.message || String(updateErr)) });
        }
    } else {
        if (!password) {
            return res.status(400).json({ error: 'Password is required for new accounts' });
        }
        try {
            console.log(`[create-user api] Creating new user record for: ${email}`);
            userRecord = await adminRunWithRetry(() => admin.auth().createUser({ email, password, displayName }));
            console.log(`[create-user api] Successfully created new user: ${userRecord.uid}`);
            res.json({ uid: userRecord.uid });
        } catch (createErr: unknown) {
            const cErr = createErr as { code?: string; message?: string };
            const cErrStr = (String(cErr?.code || '') + ' ' + String(cErr?.message || '') + ' ' + String(createErr || '')).toLowerCase();
            console.log(`[create-user api] createUser threw error: ${cErrStr}`);
            
            const isAlreadyExists = 
                (cErr?.code === 'auth/email-already-exists') || 
                (cErr?.code === 'auth/email-already-in-use') || 
                cErrStr.includes('already-exists') || 
                cErrStr.includes('already-in-use') ||
                cErrStr.includes('already exists') ||
                cErrStr.includes('already in use') ||
                cErrStr.includes('already_exists') ||
                cErrStr.includes('already_in_use') ||
                cErrStr.includes('already use') ||
                cErrStr.includes('in-use') ||
                cErrStr.includes('in use') ||
                cErrStr.includes('use');
            
            if (isAlreadyExists) {
                try {
                    console.log(`[create-user api] Email already exists. Retrying by getting existing user and updating. Email: ${email}`);
                    const existingUserRetry = await adminRunWithRetry(() => admin.auth().getUserByEmail(email));
                    const updateParams: { displayName?: string, password?: string } = { displayName };
                    if (password) {
                        updateParams.password = password;
                    }
                    userRecord = await adminRunWithRetry(() => admin.auth().updateUser(existingUserRetry.uid, updateParams));
                    console.log(`[create-user api] Successfully managed conflict and updated existing user: ${userRecord.uid}`);
                    res.json({ uid: userRecord.uid });
                } catch (updateErr: unknown) {
                    const uErr = updateErr as { message?: string };
                    console.error(`[create-user api] Failed secondary update retry:`, updateErr);
                    res.status(500).json({ error: 'Failed to update existing user on retry: ' + (uErr.message || String(updateErr)) });
                }
            } else {
                console.error(`[create-user api] Core createUser error:`, createErr);
                res.status(500).json({ error: cErr?.message || String(createErr) || 'Unknown creation error' });
            }
        }
    }
  } catch (error) {
    let errorMessage = (error as Error).message;
    if (errorMessage.includes('insufficient permission') || errorMessage.includes('Credential implementation provided to initializeApp()')) {
        errorMessage = 'خطأ في الصلاحيات: يبدو أنك استخدمت إيميلك الشخصي بدلاً من Service Account Email. يرجى الدخول للإعدادات (Settings)، والتأكد من أن حقل GOOGLE_SERVICE_ACCOUNT_EMAIL ينتهي بـ @tveta-quality.iam.gserviceaccount.com وليس إيميلك الشخصي.';
    }
    res.status(500).json({ error: errorMessage });
  }
});

app.post('/api/ai/generate', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not set on the server" });
    }
    const ai = new GoogleGenAI({ apiKey });
    const { model, contents, config } = req.body;
    
    const response = await ai.models.generateContent({
      model: model || 'gemini-3.1-pro-preview',
      contents,
      config
    });
    
    res.json({ text: response.text });
  } catch (error: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyErr = error as any;
    console.error("Gemini API Error details:", anyErr);
    res.status(500).json({ error: anyErr.message || "Failed to generate content from AI" });
  }
});

app.post('/api/email/notify-visit', async (req, res) => {
  try {
    const { email, visitDetails } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    const htmlContent = `
      <div dir="rtl" style="font-family: Arial, sans-serif;">
        <h2 style="color: #1e3a8a;">إشعار بتعيين زيارة جديدة</h2>
        <p>مرحباً،</p>
        <p>لقد تم تعيينك كمسؤول عن زيارة تفقدية جديدة. التفاصيل أدناه:</p>
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin-top: 15px;">
           <p><strong>المنشأة:</strong> ${visitDetails?.facilityName || 'غير محدد'}</p>
           <p><strong>تاريخ الزيارة:</strong> ${visitDetails?.date || 'غير محدد'}</p>
           <p><strong>نوع الزيارة:</strong> ${visitDetails?.type || 'غير محدد'}</p>
           <p><strong>الهدف:</strong> ${visitDetails?.objective || 'غير محدد'}</p>
        </div>
        <p style="margin-top: 20px;">يرجى تسجيل الدخول إلى النظام لمتابعة المهام المطلوبة.</p>
        <p>مع تحيات،<br>فريق نظام TVETA</p>
      </div>
    `;

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        service: 'gmail', // Defaults to gmail for ease, user can change if needed
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      await transporter.sendMail({
        from: `"TVETA Quality System" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'إشعار بتعيين زيارة جديدة - TVETA',
        html: htmlContent
      });
      console.log(`Email successfully sent to ${email}`);
    } else {
      console.warn("SMTP credentials (SMTP_USER, SMTP_PASS) not provided. Mocking email send:");
      console.log(`Mock Email To: ${email} | Facility: ${visitDetails?.facilityName}`);
    }
    
    res.json({ success: true, message: 'Notification processed' });
  } catch (error: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyErr = error as any;
    console.error("Email API Error:", anyErr);
    res.status(500).json({ error: anyErr.message || "Failed to send email notification" });
  }
});

const getAccessToken = (req: express.Request) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  return undefined;
};

app.get('/api/storage/config', async (req, res) => {
  try {
    const config = await getDriveConfig();
    res.json({ 
        hasEmail: !!config.clientEmail,
        hasKey: !!config.privateKey,
        hasFolder: !!config.folderId,
        email: config.clientEmail || '',
        folderId: config.folderId || ''
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/storage/config', async (req, res) => {
    try {
        const accessToken = getAccessToken(req);
        if (accessToken) {
            // Verify admin using Firebase Admin SDK
            const decodedToken = await admin.auth().verifyIdToken(accessToken);
            const userRef = await admin.firestore().collection('users').doc(decodedToken.uid).get();
            const userData = userRef.data();
            if (!userData || userData.role !== 'admin') {
                return res.status(403).json({ error: 'Unauthorized: Admins only' });
            }
        } else {
             return res.status(401).json({ error: 'Unauthorized: Missing token' });
        }

        const { clientEmail, privateKey, folderId } = req.body;
        
        await admin.firestore().collection('system_config').doc('drive').set({
            clientEmail: clientEmail?.trim() || '',
            privateKey: formatPrivateKey(privateKey) || '',
            folderId: folderId?.trim() || ''
        }, { merge: true });

        res.json({ success: true });
    } catch (error: unknown) {
        res.status(500).json({ error: (error as Error).message });
    }
});

app.get('/api/storage/test', async (req, res) => {
  try {
    const accessToken = getAccessToken(req);
    const drive = await getDriveService(accessToken);
    const response = await drive.about.get({ fields: 'user' });
    res.json({ success: true, user: response.data.user });
  } catch (error) {
    res.status(500).json({ success: false, error: formatDriveError(error) });
  }
});

app.post('/api/storage/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const accessToken = getAccessToken(req);
    const drive = await getDriveService(accessToken);
    const config = await getDriveConfig();
    const defaultFolderId = config.folderId || 'TVETA_QUALITY_MANAGEMENT';
    let parentFolderId = req.body.parentId;
    
    if (!parentFolderId || parentFolderId === 'backend-folder' || parentFolderId === 'null' || parentFolderId === 'undefined' || parentFolderId === 'root') {
      parentFolderId = await resolveFolderId(drive, defaultFolderId);
    }

    let targetFolderId = parentFolderId;

    const subfolderName = req.body.subfolder;
    if (subfolderName) {
      targetFolderId = await ensureSubfolderPath(drive, parentFolderId, subfolderName);
    }

    const bufferStream = new stream.PassThrough();
    bufferStream.end(req.file.buffer);

    let originalName = req.file.originalname;
    try {
      const decoded = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
      // If it became valid utf8 it usually has length greater than 0
      if (decoded.length > 0) {
        originalName = decoded;
      }
    } catch(e) {
      console.warn("Decoding filename error", e);
    }

    const response = await drive.files.create({
      requestBody: { name: originalName, parents: [targetFolderId] },
      media: { mimeType: req.file.mimetype, body: bufferStream },
      fields: 'id, name, webViewLink, iconLink, mimeType, thumbnailLink, size, createdTime',
    });

    try {
      await drive.permissions.create({
        fileId: response.data.id!,
        requestBody: { role: 'reader', type: 'anyone' },
      });
    } catch (permError) {
      console.warn("Could not set 'anyone' permission, maybe workspace restrictions:", permError);
    }

    res.json(response.data);
  } catch (error: unknown) {
    console.info("Upload info (falling back to local storage):", error instanceof Error ? error.message : error);
    
    try {
      let originalName = req.file!.originalname;
      try {
        const decoded = Buffer.from(req.file!.originalname, 'latin1').toString('utf8');
        if (decoded.length > 0) {
          originalName = decoded;
        }
      } catch(e) {
        console.warn("Decoding filename error", e);
      }

      const timestamp = Date.now();
      const rand = Math.floor(Math.random() * 1000);
      const safeName = originalName.replace(/[^a-zA-Z0-9.-_]/g, '_');
      const filename = `local_${timestamp}_${rand}_${safeName}`;
      const filePath = path.join(uploadsDir, filename);
      
      await fs.promises.writeFile(filePath, req.file!.buffer);
      
      const localData = {
        id: filename,
        name: originalName,
        webViewLink: `/uploads/${filename}`,
        iconLink: '',
        mimeType: req.file!.mimetype,
        thumbnailLink: `/uploads/${filename}`,
        size: String(req.file!.size),
        createdTime: new Date().toISOString()
      };
      
      console.log("Successfully saved file locally as fallback:", filename);
      return res.json(localData);
    } catch (localErr) {
      console.error("Local fallback upload failed:", localErr);
      const message = formatDriveError(error);
      const code = message.includes('الحصة التخزينية') ? 'DRIVE_QUOTA_ERROR' : 'UPLOAD_ERROR';
      return res.status(500).json({ error: `Drive error: ${message}. Local fallback also failed: ${(localErr as Error).message}`, code });
    }
  }
});

app.get('/api/storage/list', async (req, res) => {
  try {
    const accessToken = getAccessToken(req);
    const drive = await getDriveService(accessToken);
    const config = await getDriveConfig();
    let folderId = req.query.folderId as string;
    if (!folderId || folderId === 'backend-folder' || folderId === 'undefined') {
       const defaultFolderId = config.folderId || 'TVETA_QUALITY_MANAGEMENT';
       folderId = await resolveFolderId(drive, defaultFolderId);
    }
    
    // Explicitly handle "root" if it was passed by the frontend
    const effectiveFolderId = folderId === 'root' ? 'root' : folderId;
    
    const response = await drive.files.list({
      q: `'${effectiveFolderId}' in parents and trashed=false`,
      fields: 'files(id, name, webViewLink, iconLink, mimeType, thumbnailLink, size, createdTime)',
      orderBy: 'createdTime desc',
    });
    res.json(response.data.files || []);
  } catch (error) {
    console.warn("Drive list files failed, falling back to local files:", error);
    try {
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const files = await fs.promises.readdir(uploadsDir);
      const localFiles = await Promise.all(files.map(async (filename) => {
        const filePath = path.join(uploadsDir, filename);
        const stats = await fs.promises.stat(filePath);
        
        // Extract original name from local_<timestamp>_<rand>_<originalName>
        let originalName = filename;
        const match = filename.match(/^local_\d+_\d+_(.+)$/);
        if (match) {
          originalName = match[1];
        }
        
        return {
          id: filename,
          name: originalName,
          webViewLink: `/uploads/${filename}`,
          iconLink: '',
          mimeType: filename.endsWith('.json') ? 'application/json' : (filename.endsWith('.csv') ? 'text/csv' : 'application/octet-stream'),
          thumbnailLink: `/uploads/${filename}`,
          size: String(stats.size),
          createdTime: stats.birthtime.toISOString()
        };
      }));
      // Sort desc by createdTime
      localFiles.sort((a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime());
      res.json(localFiles);
    } catch (localErr) {
      console.error("Local fallback listing failed:", localErr);
      res.status(500).json({ error: formatDriveError(error) });
    }
  }
});

app.post('/api/storage/folders', async (req, res) => {
    try {
        const { name, parentId } = req.body;
        const accessToken = getAccessToken(req);
        const drive = await getDriveService(accessToken);
        const config = await getDriveConfig();
        
        let pId = parentId;
        if (!pId || pId === 'backend-folder' || pId === 'undefined' || pId === 'root') {
            const defaultFolderId = config.folderId || 'TVETA_QUALITY_MANAGEMENT';
            pId = await resolveFolderId(drive, defaultFolderId);
        }
        
        const response = await drive.files.create({
            requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: [pId] },
            fields: 'id, name'
        });
        res.json(response.data);
    } catch (error: unknown) {
        res.status(500).json({ error: formatDriveError(error) });
    }
});

app.delete('/api/storage/delete/:id', async (req, res) => {
  try {
    const fileId = req.params.id;
    if (fileId.startsWith('local_')) {
      const filePath = path.join(uploadsDir, fileId);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
      return res.json({ success: true });
    }

    const accessToken = getAccessToken(req);
    const drive = await getDriveService(accessToken);
    await drive.files.delete({ fileId: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: formatDriveError(error) });
  }
});

app.get('/api/storage/download/:id', async (req, res) => {
  try {
    const fileId = req.params.id;
    if (fileId.startsWith('local_')) {
      const filePath = path.join(uploadsDir, fileId);
      if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
      }
      return res.status(404).json({ error: 'File not found' });
    }

    const accessToken = getAccessToken(req);
    const drive = await getDriveService(accessToken);
    const response = await drive.files.get(
      { fileId: req.params.id, alt: 'media' },
      { responseType: 'stream' }
    );
    response.data.pipe(res);
  } catch (error) {
    res.status(500).json({ error: formatDriveError(error) });
  }
});

// JSON 404 for any unmatched /api routes
// MUST be defined after all legitimate API routes but before Vite/Static serving
app.use('/api', (req, res) => {
  console.warn(`[404] API Route Not Found: ${req.method} ${req.originalUrl}`);
  res.setHeader('Content-Type', 'application/json');
  res.status(404).json({ 
    error: `API Route Not Found: ${req.method} ${req.originalUrl}`,
    code: 'ROUTE_NOT_FOUND',
    hint: 'Verify the endpoint path and method.'
  });
});

// Start server function
async function startServer() {
  try {
    const distPath = path.join(process.cwd(), 'dist');
    const indexHtmlPath = path.join(distPath, 'index.html');
    const hasBuild = fs.existsSync(indexHtmlPath);

    if (process.env.NODE_ENV !== 'production' || !hasBuild) {
      console.log("Initializing Vite middleware...");
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { 
          middlewareMode: true
        },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      console.log("Serving static files from dist/");
      app.use(express.static(distPath));
    }

    // Serve workspace source files if requested (helps with DevTools / Sentry trace context in both development and production)
    app.get(['/components/*path', '/src/*path', '/pages/*path', '/services/*path'], (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) return next();
      const filePath = path.join(process.cwd(), req.path);
      if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.sendFile(filePath);
      }
      next();
    });

    // SPA Fallback for production
    if (process.env.NODE_ENV === 'production' && hasBuild) {
      app.get('*all', (req, res, next) => {
        if (req.originalUrl.startsWith('/api')) return next();
        
        // Return 404 for missing static assets instead of serving index.html
        const parsedPath = path.parse(req.path);
        if (parsedPath.ext && parsedPath.ext !== '.html') {
          return res.status(404).send('Not Found');
        }
        
        res.sendFile(indexHtmlPath);
      });
    }

    // Global Error Handler must be last
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    app.use((err: any, req: any, res: any, _next: any) => {
      const logData = {
        message: err?.message || 'Unknown Error',
        url: req?.originalUrl || req?.url,
        method: req?.method,
        status: err?.status || 500,
        stack: process.env.NODE_ENV === 'development' ? err?.stack : undefined
      };
      
      console.error("Internal Server Error caught in Global Handler:", logData);
      
      // Ensure we send JSON if the request started as an /api call
      const isApi = req?.url?.startsWith('/api') || req?.originalUrl?.startsWith('/api');
      
      if (isApi) {
        if (res && typeof res.status === 'function') {
           res.status(logData.status).json({
            error: logData.message,
            code: err?.code || 'INTERNAL_ERROR',
            path: logData.url
          });
          return;
        }
      }

      // Default fallback for non-API or broken res objects
      try {
        if (res && !res.headersSent) {
          res.status(logData.status).send(`Error: ${logData.message}`);
        }
      } catch (e) {
        console.error("Critical: Failed to send error response", e);
      }
    });

    const PORT = 3000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server listening on port ${PORT}`);
    });

  } catch (error: unknown) {
    console.error("FATAL ERROR during server startup:", error);
    try {
      const err = error as Error;
      fs.writeFileSync('startup-error.log', err?.stack || err?.message || String(error));
    } catch (writeErr) {
      console.error("Failed to write startup-error.log:", writeErr);
    }
    process.exit(1);
  }
}

startServer();
