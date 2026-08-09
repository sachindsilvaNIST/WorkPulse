/**
 * FileDownload — triggers a browser save from bytes fetched via an authenticated
 * HttpClient call (a plain <a href> can't carry the JWT bearer token).
 */
window.FileDownload = (() => {
    'use strict';

    function download(fileName, contentType, base64Data) {
        const byteChars = atob(base64Data);
        const byteNumbers = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
            byteNumbers[i] = byteChars.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: contentType || 'application/octet-stream' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = fileName || 'download';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    return { download };
})();
