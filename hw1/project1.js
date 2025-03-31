// bgImg is the background image to be modified.
// fgImg is the foreground image.
// fgOpac is the opacity of the foreground image. 
// fgPos is the position of the foreground image in pixels. It can be negative and (0,0) means the top-left pixels of the foreground and background are aligned.
function composite(bgImg, fgImg, fgOpac, fgPos) 
{
    const bgWidth = bgImg.width;
    const bgHeight = bgImg.height;
    const fgWidth = fgImg.width;
    const fgHeight = fgImg.height;

    // loop through pixels of the foreground image
    for (let y = 0; y < fgHeight; y++) {
        for (let x = 0; x < fgWidth; x++) {
            // find position on the background image
            const bgX = x + fgPos.x;
            const bgY = y + fgPos.y;

            // check if the foreground pixel is within the bounds of the background image
            if (bgX >= 0 && bgX < bgWidth && bgY >= 0 && bgY < bgHeight) {
                
                // the foreground pixel index
                const fgIndex = (y * fgWidth + x) * 4;
                // the background pixel index
                const bgIndex = (bgY * bgWidth + bgX) * 4;

                // composite the foreground pixel onto the background pixel
                const fgAlpha = fgImg.data[fgIndex + 3] * fgOpac / 255;
                const bgAlpha = 1 - fgAlpha;
                
                // rgba values of the background image
                bgImg.data[bgIndex] = fgImg.data[fgIndex] * fgAlpha + bgImg.data[bgIndex] * bgAlpha; 
                bgImg.data[bgIndex + 1] = fgImg.data[fgIndex + 1] * fgAlpha + bgImg.data[bgIndex + 1] * bgAlpha; 
                bgImg.data[bgIndex + 2] = fgImg.data[fgIndex + 2] * fgAlpha + bgImg.data[bgIndex + 2] * bgAlpha; 
                bgImg.data[bgIndex + 3] = Math.min(255, (fgAlpha + bgImg.data[bgIndex + 3] / 255) * 255); 
            }
        }
    }
}
