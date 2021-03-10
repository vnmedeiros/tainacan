// TAINACAN MEDIA COMPONENT --------------------------------------------------------
//
// Counts on some HMTL markup to make a list of media link be displayed
// as a carousel with a lightbox. Check examples in the end of the file 
import PhotoSwipe from 'photoswipe/dist/photoswipe.min.js';
import PhotoSwipeUI_Default from 'photoswipe/dist/photoswipe-ui-default.min.js';

class TainacanMediaGallery {

    /**
     * Constructor initializes the instance. Options are Snake Case because they come from PHP side
     * @param  {String}  thumbs_gallery_selector       html element to be queried containing the thumbnails list
     * @param  {String}  main_gallery_selector         html element to be queried containing the main list
     * @param  {Object}  options                       several options to be tweaked
     * @param  {Boolean} options.auto_play             sets swiper to autoplay
     * @param  {Number}  options.auto_play_delay       sets swiper to autoplay delay in milisecs
     * @param  {Boolean} options.show_arrows           shows swiper navigation arrows
     * @param  {Boolean} options.show_pagination       shows swiper pagination
     * @param  {Boolean} options.pagination_type       swiper pagination type ('bullets', 'fraction', 'progressbar')
     * @param  {Boolean} options.show_share_button     shows share button on lightbox
     * 
     * @return {Object}                                TainacanMediaGallery instance
     */
    constructor(thumbs_gallery_selector, main_gallery_selector, options) {
        this.thumbs_gallery_selector = thumbs_gallery_selector;
        this.main_gallery_selector = main_gallery_selector;
        this.thumbsSwiper = null;
        this.mainSwiper = null;
        this.options = options;
    
        this.initializeSwiper();
        
        if (this.main_gallery_selector)
            this.initPhotoSwipeFromDOM(this.main_gallery_selector + " .swiper-wrapper");
        else if (this.thumbs_gallery_selector)
            this.initPhotoSwipeFromDOM(this.thumbs_gallery_selector + " .swiper-wrapper");
    }
  
    /* Initializes Swiper JS instances of carousels */
    initializeSwiper() {
  
        let autoPlay = false;
    
        if (this.options.auto_play) {
            autoPlay = {
                delay: this.options.auto_play_delay ? this.options.auto_play_delay : 3000
            };
        }
        
        if (this.thumbs_gallery_selector) {
            const thumbSwiperOptions = {
                spaceBetween: 16,
                slidesPerView: 'auto',
                navigation: {
                    nextEl: '.swiper-button-next',
                    prevEl: '.swiper-button-prev',
                },
                pagination: {
                    el: '.swiper-pagination',
                    type: 'fraction',
                },
                autoplay: autoPlay,
                centerInsufficientSlides: true
            };
            this.thumbsSwiper = new Swiper(this.thumbs_gallery_selector, thumbSwiperOptions);
        }
    
        if (this.main_gallery_selector) {
    
            let mainSwiperOptions = {
                slidesPerView: 1,
                slidesPerGroup: 1,
                navigation: {
                    nextEl: '.swiper-button-next',
                    prevEl: '.swiper-button-prev',
                },
                pagination: {
                    el: '.swiper-pagination',
                    type: 'progressbar',
                },
            };
            if (this.thumbsSwiper) {
                mainSwiperOptions.thumbs = {
                    swiper: this.thumbsSwiper,
                    autoScrollOffset: 1
                }
            } else {
                mainSwiperOptions.thumbs = {
                    autoplay: autoPlay,
                }
            }
            this.mainSwiper = new Swiper(this.main_gallery_selector, mainSwiperOptions);
    
        }
    }
  
    initPhotoSwipeFromDOM (gallerySelector) {
        // loop through all gallery elements and bind events
        var galleryElements = document.querySelectorAll(gallerySelector);
        
        for (var i = 0, l = galleryElements.length; i < l; i++) {
            galleryElements[i].setAttribute("data-pswp-uid", i + 1);
            galleryElements[i].onclick = (event) => this.onThumbnailsClick(event, this);
        }
        
        // Parse URL and open gallery if it contains #&pid=3&gid=1
        var hashData = this.photoswipeParseHash();
        
        if (hashData.pid && hashData.gid)
            this.openPhotoSwipe(hashData.pid, galleryElements[hashData.gid - 1], true, true);
  
    }
  
    // parse slide data (url, title, size ...) from DOM elements
    // (children of gallerySelector)
    parseThumbnailElements(el) {
        var thumbElements = el.childNodes,
            numNodes = thumbElements.length,
            items = [],
            figureEl,
            linkEl,
            imgWidth,
            imgHeight,
            item;
    
        for (var i = 0; i < numNodes; i++) {
            figureEl = thumbElements[i]; // <figure> element

            // include only element nodes
            if (figureEl.nodeType !== 1)
                continue;
            console.log(figureEl);
            linkEl = figureEl.children[0]; // <a> element
            
            // There may be a wrapper div before the a tag
            if (linkEl.nodeName !== 'A')
                linkEl = linkEl.children[0];
            
            if (linkEl.classList.contains('attachment-without-image')) {
                item = {
                    html: '<div class="attachment-without-image"><iframe id="tainacan-attachment-iframe" src="' + linkEl.href +  '"></iframe></div>'
                }
            } else {
                imgWidth = linkEl.children[0] && linkEl.children[0].attributes.getNamedItem('width') ? linkEl.children[0].attributes.getNamedItem('width').value : 140;
                imgHeight = linkEl.children[0] && linkEl.children[0].attributes.getNamedItem('height') ? linkEl.children[0].attributes.getNamedItem('height').value : 140;
                
                // create slide object
                item = {
                    src: linkEl.getAttribute("href"),
                    w: parseInt(imgWidth, 10),
                    h: parseInt(imgHeight, 10)
                };
                
                if (linkEl.children[1] && linkEl.children[1].classList.contains('swiper-slide-metadata__name'))
                    item.title = linkEl.children[1].innerText;
            }
    
            item.el = figureEl; // save link to element for getThumbBoundsFn
            items.push(item);
        }
    
        console.log(items);
        return items;
    };
  
    openPhotoSwipe(
      index,
      galleryElement,
      disableAnimation,
      fromURL
    ) {
        var pswpElement = document.querySelectorAll(".pswp")[0],
            gallery,
            options,
            items;
        items = this.parseThumbnailElements(galleryElement);

        // Photoswipe options
        // https://photoswipe.com/documentation/options.html //
        options = {
            showHideOpacity: false,
            loop: false,
            // Buttons/elements
            closeEl: true,
            captionEl: true,
            fullscreenEl: true,
            zoomEl: true,
            shareEl: this.options.show_share_button ? this.options.show_share_button : false,
            counterEl: true,
            arrowEl: true,
            preloaderEl: true,
            bgOpacity: 0.85,
            // define gallery index (for URL)
            galleryUID: galleryElement.getAttribute("data-pswp-uid"),
                getThumbBoundsFn: function(index) {
                // See Options -> getThumbBoundsFn section of documentation for more info
                var thumbnail = items[index].el,
                    pageYScroll =
                    window.pageYOffset || document.documentElement.scrollTop,
                    rect = thumbnail.getBoundingClientRect();
        
                return { x: rect.left, y: rect.top + pageYScroll, w: rect.width };
            }
        };
    
        // PhotoSwipe opened from URL
        if (fromURL) {
            if (options.galleryPIDs) {
                // parse real index when custom PIDs are used
                // http://photoswipe.com/documentation/faq.html#custom-pid-in-url
                for (var j = 0; j < items.length; j++) {
                    if (items[j].pid == index) {
                        options.index = j;
                        break;
                    }
                }
            } else {
                // in URL indexes start from 1
                options.index = parseInt(index, 10) - 1;
            }
        } else {
            options.index = parseInt(index, 10);
        }
    
        // exit if index not found
        if (isNaN(options.index))
            return;
    
        if (disableAnimation)
            options.showAnimationDuration = 0;
    
        // Pass data to PhotoSwipe and initialize it
        gallery = new PhotoSwipe(pswpElement, PhotoSwipeUI_Default, items, options);
        gallery.init();
        console.log(gallery)
        /* Updates PhotoSwiper instance  from Swiper */
        var swiperInstance = this.mainSwiper ? this.mainSwiper : this.thumbsSwiper;
    
        gallery.listen("unbindEvents", function() {
            // This is index of current photoswipe slide
            var getCurrentIndex = gallery.getCurrentIndex();
            // Update position of the slider
            swiperInstance.slideTo(getCurrentIndex, 0, false);
            // Start swiper autoplay (on close - if swiper autoplay is true)
            swiperInstance.autoplay.start();
        });
    
        // Swiper autoplay stop when image zoom */
        gallery.listen('initialZoomIn', function() {
            if (swiperInstance.autoplay.running)
                swiperInstance.autoplay.stop();
        });
    };
  
    // triggers when user clicks on thumbnail
    onThumbnailsClick(e, self) {
        e = e || window.event;
        e.preventDefault ? e.preventDefault() : (e.returnValue = false);
    
        var eTarget = e.target || e.srcElement;

        // find root element of slide
        var closest = function closest(el, fn) {
            return el && (fn(el) ? el : closest(el.parentNode, fn));
        };
        
        var clickedListItem = closest(eTarget, function(el) {
            return el.tagName && el.tagName.toUpperCase() === "LI";
        });
        
        if (!clickedListItem)
            return;
    
        // find index of clicked item by looping through all child nodes
        // alternatively, you may define index via data- attribute
        var clickedGallery = clickedListItem.parentNode,
            childNodes = clickedListItem.parentNode.childNodes,
            numChildNodes = childNodes.length,
            nodeIndex = 0,
            index;

        for (var i = 0; i < numChildNodes; i++) {
            if (childNodes[i].nodeType !== 1)
                continue;
    
            if (childNodes[i] === clickedListItem) {
                index = nodeIndex;
                break;
            }
            nodeIndex++;
        }
        
        // open PhotoSwipe if valid index found
        if (index >= 0)
            self.openPhotoSwipe(index, clickedGallery);

        return false;
    }
  
    // parse picture index and gallery index from URL (#&pid=1&gid=2)
    photoswipeParseHash() {
        var hash = window.location.hash.substring(1),
            params = {};
    
        if (hash.length < 5)
            return params;
    
        var vars = hash.split("&");
        for (var i = 0; i < vars.length; i++) {
            if (!vars[i])
                continue;
            
            var pair = vars[i].split("=");
            if (pair.length < 2) 
                continue;
            
            params[pair[0]] = pair[1];
        }
    
        if (params.gid)
            params.gid = parseInt(params.gid, 10);
    
        return params;
    }
}

/* Loads and instantiates media components passed to the global variable */
document.addEventListener('DOMContentLoaded', function() {
    if (tainacan_plugin.tainacan_media_components && tainacan_plugin.tainacan_media_components.length) {
        tainacan_plugin.tainacan_media_components.forEach((component) => {
            new TainacanMediaGallery(
                component.has_media_thumbs ? '#' + component.media_thumbs_id : null,
                component.has_media_main ? '#' + component.media_main_id : null,
                component
            );
        });
    }
});


/*

---- Carousel of thumbnails only ----------------------------------------

<div class="swiper-container-thumbs swiper-container">
  <ul class="swiper-wrapper">
    <li class="swiper-slide">
      <a href="link-to-full-image-or-file">
        <img href="link-to-thumbnail" alt..>
        <span class="swiper-slide-name>File name</span>
      </a>
    </li>
  </ul>
</div>

new TainacanMediaGallery(.swiper-container-thumbs, null, {...});


---- Carousel of thumbnails with main slider ----------------------------

<div class="swiper-container-main swiper-container">
  <ul class="swiper-wrapper">
    <li class="swiper-slide">
      <a href="link-to-full-image-or-file">
        <img href="link-to-medium-or-large" alt..>
        <span class="swiper-slide-name>File name</span>
        
      </a>
    </li>
  </ul>
</div>
<div class="swiper-container-thumbs swiper-container">
  <ul class="swiper-wrapper">
    <li class="swiper-slide">
      <img href="link-to-thumbnail" alt..>
      <span class="swiper-slide-name>File name</span>
    </li>
  </ul>
</div>

new TainacanMediaGallery(.swiper-container-thumbs, .swiper-container-main, {...});

*/