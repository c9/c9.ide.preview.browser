define(function(require, exports, module) {
    main.consumes = ["plugin", "menus", "preview", "tabs", "layout"];
    main.provides = ["preview.browser"];
    return main;

    function main(options, imports, register) {
        var Plugin   = imports.plugin;
        var preview  = imports.preview;
        var tabs     = imports.tabs;
        var menus    = imports.menus;
        var layout   = imports.layout;
        // var Menu     = menus.Menu;
        var MenuItem = menus.MenuItem;
        var Divider  = menus.Divider;
        
        /***** Initialization *****/
        
        var plugin = new Plugin("Ajax.org", main.consumes);
        // var emit   = plugin.getEmitter();
        
        var loaded = false;
        function load(){
            if (loaded) return false;
            loaded = true;
            
            preview.register(plugin, function(path){
                return path.match(/(?:\.html|\.htm|\.xhtml)$|^https?\:\/\//);
            });
            
            var menu = preview.previewMenu;
            menu.append(new MenuItem({ 
                caption  : "Browser", 
                position : 10,
                onclick  : function(){
                    
                    // The menu can only be shown if the previewer has focus
                    var editor = tabs.focussedPage.editor;
                    editor.setPreviewer("preview.browser");
                }
            }));
            menu.append(new Divider({ position: 20 }));
        }
        
        /***** Methods *****/
        
        const BASEPATH = location.protocol + "//" + location.host + "/workspace";
        
        function calcRootedPath(url){
            if (url.substr(0, BASEPATH.length) == BASEPATH)
                return url.substr(BASEPATH.length);
            return url;
        }
        
        function loadDocument(doc, preview){
            var session = doc.getSession();
            var page    = doc.page;
            
            var iframe = document.createElement("iframe");
            iframe.style.width    = "100%";
            iframe.style.height   = "100%";
            iframe.style.border   = 0;
            iframe.style.backgroundColor = "rgba(255, 255, 255, 0.88)";
            
            iframe.addEventListener("load", function(){
                if (!iframe.src) return;
                
                var path = calcRootedPath(iframe.src);
                
                page.title   = 
                page.tooltip = "[B] " + path;
                session.lastSrc  = iframe.src;
                
                preview.getElement("txtPreview").setValue(path);
                page.className.remove("loading");
                
                try{ iframe.contentWindow.document } 
                catch(e) { 
                    layout.showError("Could not access: " + session.path 
                        + ". Reason: " + e.message); 
                    return;
                }
            });
            
            session.on("navigate", function(e){
                var url = e.url.match(/^[a-z]\w{1,4}\:\/\//)
                    ? e.url
                    : BASEPATH + e.url;
                
                page.className.add("loading");
                iframe.src = url;
                
                var path = calcRootedPath(url);
                page.title   = 
                page.tooltip = "[B] " + path;
                preview.getElement("txtPreview").setValue(path);
            }, session);
            session.on("update", function(e){
                if (e.saved)
                    iframe.src = iframe.src;
            }, session);
            session.on("reload", function(e){
                page.className.add("loading");
                iframe.src = iframe.src;
            }, session);
            session.on("activate", function(){
                var path = calcRootedPath(session.iframe.src);
                
                session.iframe.style.display = "block";
                preview.getElement("txtPreview").setValue(path);
                preview.getElement("btnMode").setCaption("Browser");
                preview.getElement("btnMode").setIcon("page_white.png");
            }, session);
            session.on("deactivate", function(){
                session.iframe.style.display = "none";
            }, session);
            
            session.iframe = iframe;
            preview.container.appendChild(session.iframe);
        }
        
        function unloadDocument(doc){
            var iframe = doc.getSession().iframe;
            iframe.parentNode.removeChild(iframe);
            
            doc.page.className.remove("loading");
        }
        
        /***** Lifecycle *****/
        
        plugin.on("load", function(){
            load();
        });
        plugin.on("enable", function(){
            
        });
        plugin.on("disable", function(){
            
        });
        plugin.on("unload", function(){
            loaded = false;
            // drawn  = false;
        });
        
        /***** Register and define API *****/
        
        /**
         * Draws the file tree
         * @event afterfilesave Fires after a file is saved
         *   object:
         *     node     {XMLNode} description
         *     oldpath  {String} description
         **/
        plugin.freezePublicAPI({
            /**
             */
            loadDocument : loadDocument,
            
            /**
             */
            unloadDocument : unloadDocument
        });
        
        register(null, {
            "preview.browser": plugin
        });
    }
});