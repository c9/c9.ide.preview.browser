define(function(require, exports, module) {
    main.consumes = [
        "Previewer", "preview", "vfs", "tabManager", "remote.PostMessage", 
        "CSSDocument", "HTMLDocument"
    ];
    main.provides = ["preview.browser"];
    return main;

    function main(options, imports, register) {
        var Previewer    = imports.Previewer;
        var tabManager   = imports.tabManager;
        var preview      = imports.preview;
        var PostMessage  = imports["remote.PostMessage"];
        var CSSDocument  = imports.CSSDocument;
        var HTMLDocument = imports.HTMLDocument;
        // var JSDocument   = imports.JSDocument;
        
        // var join        = require("path").join;
        // var dirname     = require("path").dirname;
        
        options.local = true;
        
        /***** Initialization *****/
        
        var plugin = new Previewer("Ajax.org", main.consumes, {
            caption  : "Browser",
            index    : 10,
            divider  : true,
            selector : function(path){
                return path.match(/(?:\.html|\.htm|\.xhtml)$|^https?\:\/\//);
            }
        });
        
        var BASEPATH = preview.previewUrl;
        var counter  = 0;
        
        /***** Methods *****/
        
        function calcRootedPath(url){
            if (url.substr(0, BASEPATH.length) == BASEPATH)
                return url.substr(BASEPATH.length);
            return url;
        }
        
        function cleanIframeSrc(src){
            return src
                .replace(/_c9_id=\w+\&_c9_host=.*?(?:\&|$)/, "")
                .replace(/[\?\&]$/, "");
        }
        
        /***** Lifecycle *****/
        
        plugin.on("load", function(){
        });
        plugin.on("documentLoad", function(e){
            var doc     = e.doc;
            var session = doc.getSession();
            var tab     = doc.tab;
            var editor  = e.editor;
            
            if (session.iframe) return;
            
            var iframe = document.createElement("iframe");
            // iframe.setAttribute("nwfaketop", true);
            iframe.setAttribute("nwdisable", true);
            
            iframe.style.width    = "100%";
            iframe.style.height   = "100%";
            iframe.style.border   = 0;
            iframe.style.backgroundColor = "rgba(255, 255, 255, 0.88)";
            
            iframe.addEventListener("load", function(){
                if (!iframe.src) return;
                
                var path = calcRootedPath(cleanIframeSrc(iframe.src));
                
                tab.title   = 
                tab.tooltip = "[B] " + path;
                session.lastSrc  = iframe.src;
                
                if (options.local) {
                    var url = cleanIframeSrc(iframe.contentWindow.location.href);
                    editor.setLocation(url);
                    session.currentLocation = url;
                }
                else {
                    editor.setLocation(path);
                }
                
                tab.className.remove("loading");
            });
            
            session.id        = "livepreview" + counter++;
            session.iframe    = iframe;
            session.editor    = editor;
            session.transport = new PostMessage(iframe, session.id);
            
            session.transport.on("ready", function(){
                session.transport.getSources(function(err, sources){
                    session.styleSheets = sources.styleSheets.map(function(path){
                        return new CSSDocument(path).addTransport(session.transport);
                    });
                    // session.scripts = sources.scripts.map(function(path){
                    //     return new JSDocument(path).addTransport(session.transport);
                    // });
                    session.html = new HTMLDocument(sources.html)
                        .addTransport(session.transport);
                });
            });
            session.transport.on("focus", function(){
                tabManager.focusTab(tab);
            });
            
            session.addOther(function(){ session.transport.unload(); });
            
            editor.container.appendChild(session.iframe);
        });
        plugin.on("documentUnload", function(e){
            var doc    = e.doc;
            var iframe = doc.getSession().iframe;
            iframe.parentNode.removeChild(iframe);
            
            doc.tab.className.remove("loading");
        });
        plugin.on("documentActivate", function(e){
            var session = e.doc.getSession();
            var path = calcRootedPath(session.iframe.src);
            
            session.iframe.style.display = "block";
            session.editor.setLocation(path, true);
            session.editor.setButtonStyle("Browser", "page_white.png");
        });
        plugin.on("documentDeactivate", function(e){
            var session = e.doc.getSession();
            session.iframe.style.display = "none";
        });
        plugin.on("navigate", function(e){
            var tab     = plugin.activeDocument.tab;
            var session = plugin.activeSession;
            var iframe  = session.iframe;
            var url = e.url.match(/^[a-z]\w{1,4}\:\/\//)
                ? e.url
                : BASEPATH + e.url;
            session.url = url;
            
            tab.className.add("loading");
            iframe.src = url + (~url.indexOf("?") ? "&" : "?")
                + "_c9_id=" + session.id
                + "&_c9_host=" + (options.local ? "local" : location.origin);
            
            var path = calcRootedPath(url);
            tab.title   = 
            tab.tooltip = "[B] " + path;
            
            plugin.activeSession.editor.setLocation(path, true);
        });
        plugin.on("update", function(e){
            // var iframe = plugin.activeSession.iframe;
            // if (e.saved)
            //     iframe.src = iframe.src;
        });
        plugin.on("reload", function(){
            var iframe = plugin.activeSession.iframe;
            var tab    = plugin.activeDocument.tab;
            tab.className.add("loading");
            iframe.src = iframe.src;
        });
        plugin.on("popout", function(){
            var src = plugin.activeSession.iframe.src;
            window.open(src);
        });
        plugin.on("getState", function(e){
            var session = e.doc.getSession();
            var state   = e.state;
            
            state.currentLocation = session.currentLocation;
        });
        plugin.on("setState", function(e){
            var session = e.doc.getSession();
            
            if (e.state.currentLocation) {
                if (session.initPath)
                    session.initPath = e.state.currentLocation;
                // else
                //     plugin.navigate({ url: e.state.currentLocation, doc: e.doc });
            }
        });
        plugin.on("unload", function(){
        });
        
        /***** Register and define API *****/
        
        /**
         * Previewer for content that the browser can display natively.
         **/
        plugin.freezePublicAPI({
            
        });
        
        register(null, {
            "preview.browser": plugin
        });
    }
});