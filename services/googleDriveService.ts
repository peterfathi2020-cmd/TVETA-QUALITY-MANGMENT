
// This service integrates with the real Google Drive API.
// It requires a valid Client ID and API Key from Google Cloud Console.

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

// Access environment variables safely
const getEnv = (key: string) => {
  // 1. Try import.meta.env (Vite standard)
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    // @ts-ignore
    return import.meta.env[key];
  }
  
  // 2. Try process.env (Fallback/Injected)
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    // @ts-ignore
    return process.env[key];
  }
  
  return '';
};

const CLIENT_ID = getEnv('VITE_GOOGLE_CLIENT_ID');
const API_KEY = getEnv('VITE_GOOGLE_API_KEY');

const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const CENTRAL_FOLDER_NAME = "TVETA_QUALITY_MANAGEMENT";

let tokenClient: any;
let initPromise: Promise<void> | null = null;
let accessToken: string | null = null;

// Load GAPI scripts dynamically with Promise support
export const loadGoogleScripts = (): Promise<void> => {
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return resolve();

    let gapiLoaded = false;
    let gisLoaded = false;

    const checkDone = () => {
      if (gapiLoaded && gisLoaded) {
          resolve();
      }
    };

    // Initialize GAPI
    const initGapi = () => {
        window.gapi.load('client', async () => {
            try {
                if (!API_KEY) {
                    console.warn("Google API Key missing. GAPI initialization might fail.");
                }
                await window.gapi.client.init({
                    apiKey: API_KEY,
                    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
                });
                gapiLoaded = true;
                checkDone();
            } catch (e) {
                console.error("GAPI Init Error:", e);
                reject(e);
            }
        });
    };

    // Initialize GIS (Identity Services)
    const initGis = () => {
        if (!CLIENT_ID) {
            console.error("GIS Init Skipped: VITE_GOOGLE_CLIENT_ID is missing.");
            gisLoaded = true; 
            checkDone();
            return;
        }

        try {
            tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: '', // defined at request time
            });
            gisLoaded = true;
            checkDone();
        } catch (e) {
            console.error("GIS Init Error:", e);
            reject(e);
        }
    };

    if (window.gapi) initGapi();
    else {
        const script1 = document.createElement('script');
        script1.src = 'https://apis.google.com/js/api.js';
        script1.async = true;
        script1.defer = true;
        script1.onload = initGapi;
        document.body.appendChild(script1);
    }

    if (window.google && window.google.accounts) initGis();
    else {
        const script2 = document.createElement('script');
        script2.src = 'https://accounts.google.com/gsi/client';
        script2.async = true;
        script2.defer = true;
        script2.onload = initGis;
        document.body.appendChild(script2);
    }
  });

  return initPromise;
};

export const initGoogleDrive = async () => {
    await loadGoogleScripts();
    if (!accessToken) {
        await authenticateGoogle();
    }
    return true;
};

export const authenticateGoogle = async (): Promise<string> => {
  await loadGoogleScripts();

  return new Promise((resolve, reject) => {
    if (!tokenClient) {
        if (!CLIENT_ID) {
            reject("Google Client ID is missing.");
            return;
        }
        // Retry init if missing
        try {
             tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: '',
             });
        } catch (e) {
             reject("Failed to initialize Google Token Client.");
             return;
        }
    }

    // Check if token exists and is valid (basic check)
    if (accessToken && window.gapi?.client?.getToken()?.access_token) {
        resolve(accessToken);
        return;
    }

    tokenClient.callback = (resp: any) => {
      if (resp.error) {
        reject(resp);
      }
      accessToken = resp.access_token;
      if (window.gapi.client) {
          window.gapi.client.setToken(resp);
      }
      resolve(resp.access_token);
    };

    tokenClient.requestAccessToken({ prompt: '' });
  });
};

const getAccessToken = () => {
    return accessToken || window.gapi?.client?.getToken()?.access_token;
};

// Make file readable by anyone with the link (so other users can view reports)
export const addFilePermission = async (fileId: string) => {
    await loadGoogleScripts();
    try {
        await window.gapi.client.drive.permissions.create({
            fileId: fileId,
            resource: {
                role: 'reader',
                type: 'anyone', 
            }
        });
    } catch (e) {
        console.warn("Error setting permissions", e);
        // Continue, as upload was successful
    }
};

export const getSystemFolderId = async (): Promise<string> => {
    await loadGoogleScripts();
    try {
        if (!getAccessToken()) await authenticateGoogle();

        const response = await window.gapi.client.drive.files.list({
            q: `mimeType='application/vnd.google-apps.folder' and name='${CENTRAL_FOLDER_NAME}' and trashed=false`,
            fields: 'files(id, name)',
        });

        if (response.result.files && response.result.files.length > 0) {
            return response.result.files[0].id;
        } else {
            return await createDriveFolder(CENTRAL_FOLDER_NAME);
        }
    } catch (e) {
        console.error("Error finding system folder", e);
        throw e;
    }
};

export const createDriveFolder = async (folderName: string, parentId?: string): Promise<string> => {
    let token = getAccessToken();
    if (!token) token = await authenticateGoogle();

    try {
        const fileMetadata: any = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
        };
        if (parentId) {
            fileMetadata.parents = [parentId];
        }

        const response = await window.gapi.client.drive.files.create({
            resource: fileMetadata,
            fields: 'id'
        });
        
        // Make the folder publicly readable? Optional. 
        // await addFilePermission(response.result.id); 
        
        return response.result.id;
    } catch (e) {
        console.error("Error creating folder", e);
        throw e;
    }
};

export const uploadFileToDrive = async (file: File, folderId?: string): Promise<any> => {
    let token = getAccessToken();
    if (!token) token = await authenticateGoogle();

    const metadata = {
        name: file.name,
        mimeType: file.type,
        parents: folderId ? [folderId] : [],
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,iconLink,mimeType,thumbnailLink,size', {
        method: 'POST',
        headers: new Headers({ 'Authorization': 'Bearer ' + token }),
        body: form,
    });
    
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Drive Upload Failed: ${res.status} ${errText}`);
    }

    const result = await res.json();
    
    // Set permission so others can view it
    await addFilePermission(result.id);

    return result;
};

export const listDriveFiles = async (folderId?: string) => {
     await loadGoogleScripts();
     
     if (!getAccessToken()) {
         try {
             await authenticateGoogle();
         } catch(e) {
             console.warn("Authentication failed or skipped", e);
             return [];
         }
     }

     let query = "trashed=false";
     if(folderId) {
         query += ` and '${folderId}' in parents`;
     } else {
         try {
             const systemId = await getSystemFolderId();
             query += ` and '${systemId}' in parents`;
         } catch {
             return [];
         }
     }

     try {
        const response = await window.gapi.client.drive.files.list({
            q: query,
            fields: 'files(id, name, mimeType, webViewLink, iconLink, thumbnailLink, createdTime, size)',
            pageSize: 100,
            orderBy: 'folder, createdTime desc'
        });
        return response.result.files;
     } catch (e) {
         console.error("List files error", e);
         throw e;
     }
};

export const deleteFileFromDrive = async (fileId: string) => {
    let token = getAccessToken();
    if (!token) await authenticateGoogle();
    
    await window.gapi.client.drive.files.delete({
        fileId: fileId
    });
};
