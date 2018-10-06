/**
 * get file from URL
 */
var url_string = window.location.href; //"blabla.html?open=blabla.pdf"
var url = new URL(url_string);
var file = url.searchParams.get("open");

/**
 * default render parameters
 */
var pdfDoc = null,
    pageNum = 1,
    pageRendering = false,
    pageNumPending = null,
    scale = 1,
    viewer = document.getElementById("viewer");

/*
* Get meta and render
*/
PDFJS.getDocument(file).then(function (pdfDoc_) {
  pdfDoc = pdfDoc_;
  pdfDoc.getMetadata().then(function (_ref5) {
      var info = _ref5.info,
          metadata = _ref5.metadata;
      console.log("PDF " + pdfDoc.fingerprint + " [" + info.PDFFormatVersion + " " + (info.Producer || "-").trim() + " / " + (info.Creator || "-").trim() + "]");
      var pdfTitle = void 0;
      if (metadata && metadata.has("dc:title")) {
        var title = metadata.get("dc:title");
        if (title !== "Untitled") {
          pdfTitle = title;
        }
      }
      if (!pdfTitle && info && info["Title"]) {
        pdfTitle = info["Title"];
      }
      //default book name if cannot find in info or metadata
      if (!pdfTitle) {
        pdfTitle = "Untitled";
      }
      var pdfAuthor = void 0;
      if (metadata && metadata.has("dc:author")) {
        pdfAuthor = metadata.get("dc:author");
      }
      if (!pdfAuthor && info && info["Author"]) {
        pdfAuthor = info["Author"];
      }
      //default author name if cannot find in info or metadata
      if (!pdfAuthor) {
        pdfAuthor = "Anonymous";
      }
      if (info.IsAcroFormPresent) {
        console.warn("Warning: AcroForm/XFA is not supported");
      }
      document.getElementById("page_count").textContent = pdfDoc.numPages;
      document.getElementById("pdftitle").textContent = pdfTitle;
      document.getElementById("pdfauthor").textContent = pdfAuthor;

      //render first page
      renderPage(pageNum);

    }).catch(function(err) {
        console.log("Error getting PDF from " + url);
        console.log(err);
    });
});

/**
  * Get page info from document, resize canvas accordingly, and render page.
  * @param num Page number.
  */
function renderPage(num) {
    pageRendering = true;
    // Using promise to fetch the page
    pdfDoc.getPage(num).then(function(page) {
        var viewport = page.getViewport(scale);
        // prvent from multiple textlayers
        if (document.getElementById("rendered")) {
                document.getElementById("rendered").remove();
        }
        //create new elements for canvas and textlayer
        var div = document.createElement("div");
        div.id = 'rendered';
        div.className = 'page';
        div.style.width = Math.floor(viewport.width) + 'px';
        div.style.height = Math.floor(viewport.height) + 'px';
        div.setAttribute('page-number', num);
        viewer.appendChild(div);

        // create canvas wrapper
        var canvasWrapper = document.createElement('div');
        canvasWrapper.style.width = div.style.width;
        canvasWrapper.style.height = div.style.height;
        canvasWrapper.classList.add('canvasWrapper');
        div.appendChild(canvasWrapper);

        // Create a new Canvas element
        var canvas = document.createElement("canvas");
        canvasWrapper.appendChild(canvas);
        var ctx = canvas.getContext("2d");
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Render PDF page into canvas context
        var renderContext = {
        canvasContext: ctx,
        viewport: viewport
        };

        var renderTask = page.render(renderContext);
        // Wait for rendering to finish
        renderTask.promise
        .then(function () {
            pageRendering = false;
            if (pageNumPending !== null) {
            // New page rendering is pending
            renderPage(pageNumPending);
            pageNumPending = null;
            }
        })
        .then(function() {
            // Get text-fragments
            return page.getTextContent();
        })
        .then(function(textContent) {
            // Create div which will hold text-fragments
            var textLayerDiv = document.createElement("div");
            textLayerDiv.style.width = div.style.width;
            textLayerDiv.style.height = div.style.height;
            textLayerDiv.classList.add('textLayer');
            div.appendChild(textLayerDiv);;

            var textLayer = new TextLayerBuilder({
            textLayerDiv: textLayerDiv,
            viewport: viewport
            });
            // Set text-fragments
            textLayer.setTextContent(textContent);

            // Render text-fragments
            textLayer.render();
        });
});
    // Update page counters
    document.getElementById("page_num").textContent = pageNum;
}

 /**
  * If another page rendering in progress, waits until the rendering is
  * finised. Otherwise, executes rendering immediately.
  */
function queueRenderPage(num) {
  if (pageRendering) {
    pageNumPending = num;
  } else {
    renderPage(num);
  }
}

/**
 * Displays previous page.
*/
function onPrevPage() {
  if (pageNum <= 1) {
    return;
  }
  pageNum--;
  queueRenderPage(pageNum);
 }
document.getElementById("prev").addEventListener("click", onPrevPage);

/**
 * Displays next page.
 */
 function onNextPage() {
  if (pageNum >= pdfDoc.numPages) {
    return;
  }
  pageNum++;
  queueRenderPage(pageNum);
}
document.getElementById("next").addEventListener("click", onNextPage);

function zoomIn() {
    scale = scale + 0.25;
    queueRenderPage(pageNum);
}

function zoomOut() {
    if (scale <= 0.25) {
        return;
    }
    scale = scale - 0.25;
    queueRenderPage(pageNum);
}

function zoomReset() {
  scale = 1;
  queueRenderPage(pageNum);
}

document.getElementById("zoomin").addEventListener("click", zoomIn);
document.getElementById("zoomout").addEventListener("click", zoomOut);
document.getElementById("zoomreset").addEventListener("click", zoomReset);

/**
 * remove canvas for new page
 */
Element.prototype.remove = function() {
    this.parentElement.removeChild(this);
}
NodeList.prototype.remove = HTMLCollection.prototype.remove = function() {
    for(var i = this.length - 1; i >= 0; i--) {
        if(this[i] && this[i].parentElement) {
            this[i].parentElement.removeChild(this[i]);
        }
    }
}
