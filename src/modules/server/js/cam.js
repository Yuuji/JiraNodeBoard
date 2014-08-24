$(function() {
    var socket = io('http://localhost:4000');
    var doRedraw = false;
    var currentImage = false;
    var tags = false;

    function redraw() {
        var canvas = document.getElementById('camcanvas');
        var ctx = canvas.getContext('2d');
        
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (currentImage) {
            ctx.drawImage(currentImage, 0, 0);
        }

        if (tags) {
            if (tags.tags.length>0) {
                var canvas = document.getElementById('camcanvas');
                var ctx = canvas.getContext('2d');
                for (var key in tags.tags) {
                    var tag = tags.tags[key];
                    for (var bkey in tag.borders) {
                        var border = tag.borders[bkey];
                        ctx.beginPath();
                        ctx.moveTo(border.p1.x, border.p1.y);
                        ctx.lineTo(border.p2.x, border.p2.y);
                        ctx.strokeStyle = '#ff0000';
                        ctx.stroke();
                    }
                    ctx.font = 'bold 12pt Calibri';
                    ctx.fillStyle = '#ff0000';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'top';
                    ctx.fillText(tag.id, tag.center.x, tag.center.y);
                }
                console.log(tags);
            }
        }
    };
    
    setInterval(function() {
        if (doRedraw) {
            redraw();
            doRedraw = false;
        }
    }, 200);

    socket.on('settings', function(data){
        $('#camcanvas')
            .attr('width', data.xRes)
            .attr('height', data.yRes);
            
        console.log('test');
        socket.emit('join', 'tags');
        //socket.emit('join', 'image');
    });

    socket.on('image', function(data) {      
        var img = new Image();
        img.onload = function() {
            currentImage = this;
            doRedraw = true;
        }
        img.src = 'data:image/png;base64,' + data;
    });

    socket.on('tags', function(data) {
        tags = data;
        doRedraw = true;
    });
});