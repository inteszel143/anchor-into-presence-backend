import { UPLOAD_LIMIT_MESSAGE } from "./activityUploadLimits";
/** Upload progress covers browser → server; completion still waits for storage and saving. */
export function uploadActivity(form: FormData, onProgress: (percent: number) => void): Promise<{ ok: boolean; message?: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/activities/create");
    xhr.upload.onprogress = event => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.min(100, Math.round(event.loaded / event.total * 100)));
      }
    };
    xhr.upload.onload = () => onProgress(100);
    xhr.onload = () => {
      let message: string | undefined;
      try { message = JSON.parse(xhr.responseText).message; } catch { /* Proxy errors may return HTML. */ }
      if (xhr.status === 413) message = UPLOAD_LIMIT_MESSAGE;
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, message });
    };
    xhr.onerror = () => reject(new Error("The connection was interrupted. Check the activity list before retrying."));
    xhr.onabort = () => reject(new Error("Upload cancelled."));
    xhr.send(form);
  });
}
