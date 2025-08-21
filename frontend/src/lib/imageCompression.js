// frontend/src/lib/imageCompression.js
const dataUrlBytes = (dataUrl) => {
    const base64 = dataUrl.split(",")[1] || "";
    return Math.floor((base64.length * 3) / 4);
};

const loadImage = (src) =>
    new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });

const fileToDataURL = (file) =>
    new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = reject;
        fr.readAsDataURL(file);
    });

export async function compressToPng(
    file,
    {
        maxWidth = 800,      // start smaller to help hit 50 KB
        maxHeight = 800,
        targetKB = 50,       // <= 50 KB
        minWidth = 128,      // don't go below this
        minHeight = 128,
        step = 0.8,          // shrink by 80% each loop if still too big
    } = {}
) {
    if (!file) throw new Error("No file provided");
    const originalUrl = await fileToDataURL(file);
    const img = await loadImage(originalUrl);

    const drawToPng = (w, h) => {
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        return canvas.toDataURL("image/png"); // PNG only
    };

    // keep aspect ratio
    const aspect = img.width / img.height;
    let w, h;
    if (aspect >= 1) { w = Math.min(img.width, maxWidth); h = Math.round(w / aspect); }
    else { h = Math.min(img.height, maxHeight); w = Math.round(h * aspect); }

    let dataUrl = drawToPng(w, h);
    const targetBytes = targetKB * 1024;

    while (dataUrlBytes(dataUrl) > targetBytes && (w > minWidth || h > minHeight)) {
        w = Math.max(Math.round(w * step), minWidth);
        h = Math.max(Math.round(h * step), minHeight);
        dataUrl = drawToPng(w, h);
    }

    const blob = await (await fetch(dataUrl)).blob();
    const pngFile = new File([blob], (file.name?.replace(/\.\w+$/, "") || "image") + ".png", {
        type: "image/png",
    });

    return { dataUrl, file: pngFile, bytes: dataUrlBytes(dataUrl), width: w, height: h };
}
