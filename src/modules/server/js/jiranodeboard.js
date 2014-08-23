$(function() {
    var JiraNodeBoard = function() {
        this.init();
    };
    
    JiraNodeBoard.prototype.init = function() {
        this.bind();
        this.initMenu();
    };
    
    JiraNodeBoard.prototype.bind = function() {
        var that_ = this;
        $(document).on('submit', 'form', function() {
            event.preventDefault();
            var data = $( this ).serializeArray();
            $.ajax({
                type: "POST",
                url: '/module/server/page/' + $(this).data('page'),
                data: data,
                success: function(data) {
                    that_.loadPage(data.page);
                }
            });
            return false;
        });
    };
    
    JiraNodeBoard.prototype.initMenu = function() {
        var that_ = this;
        $('#menu > ul > li').click(function() {
            that_.menuClick(this);
        });
        $('#menu > ul > li[data-page=home]').click();
    };
    
    JiraNodeBoard.prototype.menuClick = function(el) {
        $('#menu > ul > li').removeClass('active');
        $(el).addClass('active');
        this.loadPage($(el).data('page'));
    };
    
    JiraNodeBoard.prototype.loadPage = function(page) {
        $('#content').load('/module/server/page/' + page);
    };
    
    JiraNodeBoard.prototype.loadJS = function(filename) {
        var script=document.createElement('script');
        script.setAttribute("type","text/javascript");
        script.setAttribute("src", filename);
        $('#content').append(script);
    };
    
    JiraNodeBoard.prototype.loadCSS = function(filename) {
        var css=document.createElement("link");
        css.setAttribute("rel", "stylesheet");
        css.setAttribute("type", "text/css");
        css.setAttribute("href", filename);
        $('#content').append(css);
    };
    
    window.JiraNodeBoard = new JiraNodeBoard();
});