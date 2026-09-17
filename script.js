/* =========================================================
   CSU ROTC PROFILE FRAME CHANGER
   ========================================================= */

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const photoInput =
    document.getElementById("photoInput");

const zoomInput =
    document.getElementById("zoom");

const zoomValue =
    document.getElementById("zoomValue");

const fileName =
    document.getElementById("fileName");

const downloadButton =
    document.getElementById("downloadButton");


/* =========================================================
   CANVAS
   ========================================================= */

const SIZE = 1024;

canvas.width = SIZE;
canvas.height = SIZE;


/* =========================================================
   FRAME
   ========================================================= */

const FRAME_FILE = "ProfileFrame.png";


/* =========================================================
   PHOTO OPENING

   These values match the circular opening in
   your ProfileFrame.png.
   ========================================================= */

const PHOTO_CENTER_X = 512;
const PHOTO_CENTER_Y = 510;
const PHOTO_RADIUS = 410;


/* =========================================================
   IMAGE OBJECTS
   ========================================================= */

const photoImage = new Image();
const frameImage = new Image();


let photoLoaded = false;
let frameLoaded = false;


/* =========================================================
   PHOTO SETTINGS
   ========================================================= */

let photoX = PHOTO_CENTER_X;
let photoY = PHOTO_CENTER_Y;

let zoom = 1;

let rotation = 0;


/* =========================================================
   DRAGGING
   ========================================================= */

let dragging = false;

let lastPointerX = 0;
let lastPointerY = 0;


/* =========================================================
   FRAME OVERLAY
   ========================================================= */

let frameOverlay = null;


/* =========================================================
   LOAD FRAME
   ========================================================= */

frameImage.onload = function () {

    frameLoaded = true;

    frameOverlay =
        createFrameOverlay();

    draw();

};


frameImage.onerror = function () {

    console.error(
        "ERROR: ProfileFrame.png was not found."
    );

};


frameImage.src =
    FRAME_FILE;


/* =========================================================
   LOAD PHOTO
   ========================================================= */

photoInput.addEventListener(
    "change",
    function (event) {  

        const file =
            event.target.files[0];

        if (!file) {
            return;
        }

        emptyState.style.display = "none";

        if (!file.type.startsWith("image/")) {

            alert(
                "Please choose an image file."
            );

            return;
        }


        fileName.textContent =
            file.name;


        const reader =
            new FileReader();


        reader.onload = function () {

            photoImage.onload =
                function () {

                    photoLoaded = true;


                    /* Reset position */

                    photoX =
                        PHOTO_CENTER_X;

                    photoY =
                        PHOTO_CENTER_Y;


                    zoom = 1;

                    rotation = 0;


                    zoomInput.value =
                        100;

                    zoomValue.textContent =
                        "100%";


                    draw();

                };


            photoImage.onerror =
                function () {

                    alert(
                        "The photo could not be loaded."
                    );

                };


            photoImage.src =
                reader.result;

        };


        reader.readAsDataURL(file);

    }
);


/* =========================================================
   CREATE FRAME OVERLAY
   =========================================================

   IMPORTANT:

   The frame PNG has a BLACK circular center.

   Instead of deleting all dark pixels, we find
   ONLY the black region connected to the CENTER
   of the frame.

   This means black parts of the cadet silhouettes,
   text, outlines, etc. are NOT deleted.

   Only the actual photo-window is removed.
   ========================================================= */

function createFrameOverlay() {

    const overlay =
        document.createElement("canvas");


    overlay.width = SIZE;
    overlay.height = SIZE;


    const overlayCtx =
        overlay.getContext("2d");


    /* Draw original frame */

    overlayCtx.drawImage(
        frameImage,
        0,
        0,
        SIZE,
        SIZE
    );


    /* Get pixels */

    const imageData =
        overlayCtx.getImageData(
            0,
            0,
            SIZE,
            SIZE
        );


    const data =
        imageData.data;


    /* =====================================================
       FIND CENTER BLACK REGION
       ===================================================== */

    const startX =
        Math.round(
            PHOTO_CENTER_X
        );

    const startY =
        Math.round(
            PHOTO_CENTER_Y
        );


    /*
       Pixel threshold.

       This is ONLY used for finding the connected
       black center region.
    */

    const BLACK_THRESHOLD = 45;


    function isBlack(x, y) {

        if (
            x < 0 ||
            x >= SIZE ||
            y < 0 ||
            y >= SIZE
        ) {

            return false;

        }


        const index =
            (y * SIZE + x) * 4;


        const r =
            data[index];

        const g =
            data[index + 1];

        const b =
            data[index + 2];

        const a =
            data[index + 3];


        if (a === 0) {
            return false;
        }


        return (
            r <= BLACK_THRESHOLD &&
            g <= BLACK_THRESHOLD &&
            b <= BLACK_THRESHOLD
        );

    }


    /*
       Make sure the center itself is actually
       a black area before flood filling.
    */

    if (
        !isBlack(
            startX,
            startY
        )
    ) {

        console.warn(
            "The center of ProfileFrame.png is not black."
        );

        return overlay;

    }


    /* =====================================================
       FLOOD FILL
       ===================================================== */

    const visited =
        new Uint8Array(
            SIZE * SIZE
        );


    const queueX = [];
    const queueY = [];


    queueX.push(startX);
    queueY.push(startY);


    visited[
        startY * SIZE + startX
    ] = 1;


    let head = 0;


    while (
        head <
        queueX.length
    ) {

        const x =
            queueX[head];

        const y =
            queueY[head];

        head++;


        /*
           Only allow the flood fill inside
           the circular photo area.

           This prevents it from ever touching
           the outside background.
        */

        const dx =
            x -
            PHOTO_CENTER_X;

        const dy =
            y -
            PHOTO_CENTER_Y;


        if (
            dx * dx +
            dy * dy >
            PHOTO_RADIUS *
            PHOTO_RADIUS
        ) {

            continue;

        }


        const neighbors = [

            [x + 1, y],

            [x - 1, y],

            [x, y + 1],

            [x, y - 1]

        ];


        for (
            const neighbor
            of neighbors
        ) {

            const nx =
                neighbor[0];

            const ny =
                neighbor[1];


            if (
                nx < 0 ||
                nx >= SIZE ||
                ny < 0 ||
                ny >= SIZE
            ) {

                continue;

            }


            const index =
                ny * SIZE + nx;


            if (
                visited[index]
            ) {

                continue;

            }


            /*
               Don't flood outside
               the circular photo opening.
            */

            const ndx =
                nx -
                PHOTO_CENTER_X;

            const ndy =
                ny -
                PHOTO_CENTER_Y;


            if (
                ndx * ndx +
                ndy * ndy >
                PHOTO_RADIUS *
                PHOTO_RADIUS
            ) {

                continue;

            }


            if (
                !isBlack(
                    nx,
                    ny
                )
            ) {

                continue;

            }


            visited[index] = 1;

            queueX.push(nx);
            queueY.push(ny);

        }

    }


    /* =====================================================
       REMOVE ONLY THE CENTER BLACK REGION
       ===================================================== */

    for (
        let i = 0;
        i < visited.length;
        i++
    ) {

        if (
            visited[i] !== 1
        ) {

            continue;

        }


        const x =
            i % SIZE;

        const y =
            Math.floor(
                i / SIZE
            );


        /*
           Extra safety:

           Only remove pixels inside
           the photo circle.
        */

        const dx =
            x -
            PHOTO_CENTER_X;

        const dy =
            y -
            PHOTO_CENTER_Y;


        if (
            dx * dx +
            dy * dy <=
            PHOTO_RADIUS *
            PHOTO_RADIUS
        ) {

            const pixel =
                i * 4;


            data[pixel + 3] =
                0;

        }

    }


    /* Put corrected frame back */

    overlayCtx.putImageData(
        imageData,
        0,
        0
    );


    return overlay;
}


/* =========================================================
   DRAW PHOTO
   ========================================================= */

function drawPhoto() {

    if (
        !photoLoaded
    ) {

        return;

    }


    ctx.save();


    /* ---------------------------------------------
       Circular clipping
       --------------------------------------------- */

    ctx.beginPath();

    ctx.arc(
        PHOTO_CENTER_X,
        PHOTO_CENTER_Y,
        PHOTO_RADIUS,
        0,
        Math.PI * 2
    );

    ctx.closePath();

    ctx.clip();


    /* ---------------------------------------------
       Position
       --------------------------------------------- */

    ctx.translate(
        photoX,
        photoY
    );


    /* ---------------------------------------------
       Rotation
       --------------------------------------------- */

    ctx.rotate(
        rotation
    );


    /* ---------------------------------------------
       Fit photo inside circle
       --------------------------------------------- */

    const imageWidth =
        photoImage.naturalWidth;

    const imageHeight =
        photoImage.naturalHeight;


    const diameter =
        PHOTO_RADIUS * 2;


    const scaleToCover =
        Math.max(

            diameter /
            imageWidth,

            diameter /
            imageHeight

        );


    const finalScale =
        scaleToCover *
        Math.max(1, zoom);


    const drawWidth =
        imageWidth *
        finalScale;


    const drawHeight =
        imageHeight *
        finalScale;


    /* ---------------------------------------------
       Draw
       --------------------------------------------- */

    ctx.drawImage(

        photoImage,

        -drawWidth / 2,

        -drawHeight / 2,

        drawWidth,

        drawHeight

    );


    ctx.restore();

}


/* =========================================================
   DRAW
   ========================================================= */

function draw() {

    /* Clear */

    ctx.clearRect(
        0,
        0,
        SIZE,
        SIZE
    );


    /* Black background */

    ctx.fillStyle =
        "#000000";

    ctx.fillRect(
        0,
        0,
        SIZE,
        SIZE
    );


    /* =====================================================
       PHOTO FIRST
       ===================================================== */

    drawPhoto();


    /* =====================================================
       FRAME SECOND
       ===================================================== */

    if (
        frameLoaded &&
        frameOverlay
    ) {

        ctx.drawImage(
            frameOverlay,
            0,
            0
        );

    }

}


/* =========================================================
   ZOOM
   ========================================================= */

zoomInput.addEventListener(
    "input",
    function () {

        zoom =
            Number(
                this.value
            ) / 100;


        zoomValue.textContent =
            this.value + "%";


        draw();

    }
);


/* =========================================================
   MOVE PHOTO
   ========================================================= */

function movePhoto(
    x,
    y
) {

    if (!photoLoaded) {
        return;
    }


    photoX += x;

    photoY += y;


    draw();

}


/* UP */

document
    .getElementById("up")
    .addEventListener(
        "click",
        function () {

            movePhoto(
                0,
                -10
            );

        }
    );


/* DOWN */

document
    .getElementById("down")
    .addEventListener(
        "click",
        function () {

            movePhoto(
                0,
                10
            );

        }
    );


/* LEFT */

document
    .getElementById("left")
    .addEventListener(
        "click",
        function () {

            movePhoto(
                -10,
                0
            );

        }
    );


/* RIGHT */

document
    .getElementById("right")
    .addEventListener(
        "click",
        function () {

            movePhoto(
                10,
                0
            );

        }
    );


/* =========================================================
   RESET
   ========================================================= */

document
    .getElementById("reset")
    .addEventListener(
        "click",
        function () {

            photoX =
                PHOTO_CENTER_X;

            photoY =
                PHOTO_CENTER_Y;

            zoom = 1;

            rotation = 0;


            zoomInput.value =
                100;

            zoomValue.textContent =
                "100%";


            draw();

        }
    );


/* =========================================================
   ROTATE LEFT
   ========================================================= */

document
    .getElementById("rotateLeft")
    .addEventListener(
        "click",
        function () {

            if (!photoLoaded) {
                return;
            }


            rotation -=
                Math.PI / 36;


            draw();

        }
    );


/* =========================================================
   ROTATE RIGHT
   ========================================================= */

document
    .getElementById("rotateRight")
    .addEventListener(
        "click",
        function () {

            if (!photoLoaded) {
                return;
            }


            rotation +=
                Math.PI / 36;


            draw();

        }
    );


/* =========================================================
   DRAG PHOTO
   ========================================================= */

canvas.addEventListener(
    "pointerdown",
    function (event) {

        if (!photoLoaded) {
            return;
        }


        dragging = true;


        const rect =
            canvas.getBoundingClientRect();


        lastPointerX =
            event.clientX -
            rect.left;


        lastPointerY =
            event.clientY -
            rect.top;


        canvas.setPointerCapture(
            event.pointerId
        );

    }
);


canvas.addEventListener(
    "pointermove",
    function (event) {

        if (
            !dragging ||
            !photoLoaded
        ) {

            return;

        }


        const rect =
            canvas.getBoundingClientRect();


        const currentX =
            event.clientX -
            rect.left;


        const currentY =
            event.clientY -
            rect.top;


        const scaleX =
            SIZE /
            rect.width;


        const scaleY =
            SIZE /
            rect.height;


        photoX +=
            (
                currentX -
                lastPointerX
            ) * scaleX;


        photoY +=
            (
                currentY -
                lastPointerY
            ) * scaleY;


        lastPointerX =
            currentX;


        lastPointerY =
            currentY;


        draw();

    }
);


canvas.addEventListener(
    "pointerup",
    function (event) {

        dragging = false;


        try {

            canvas.releasePointerCapture(
                event.pointerId
            );

        } catch (error) {}

    }
);


canvas.addEventListener(
    "pointercancel",
    function () {

        dragging = false;

    }
);


/* =========================================================
   DOWNLOAD
   ========================================================= */

downloadButton.addEventListener(
    "click",
    function () {

        if (!photoLoaded) {

            alert(
                "Please choose a photo first."
            );

            return;

        }


        draw();


        canvas.toBlob(
            function (blob) {

                if (!blob) {

                    alert(
                        "Could not create the image."
                    );

                    return;

                }


                const url =
                    URL.createObjectURL(
                        blob
                    );


                const link =
                    document.createElement(
                        "a"
                    );


                link.href =
                    url;


                link.download =
                    "CSU_ROTC_Profile_Picture.png";


                document.body.appendChild(
                    link
                );


                link.click();


                document.body.removeChild(
                    link
                );


                setTimeout(
                    function () {

                        URL.revokeObjectURL(
                            url
                        );

                    },
                    1000
                );

            },
            "image/png"
        );

    }
);


/* =========================================================
   INITIAL DRAW
   ========================================================= */

draw();