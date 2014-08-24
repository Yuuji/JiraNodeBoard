var socket = io('http://localhost:4000');

socket.on('image', function(data) {
    var canvas = document.getElementById('camcanvas');
    var ctx = canvas.getContext('2d');

    var img = new Image();
    img.onload = function() {
        var x = 0;
        var y = 0;
        ctx.drawImage(this, x, y);
    }
    img.src = 'data:image/png;base64,' + data;
});

socket.on('tags', function(data) {
    if (data.tags.length>0) {
        var canvas = document.getElementById('camcanvas');
        var ctx = canvas.getContext('2d');
        for (var key in data.tags) {
            var tag = data.tags[key];
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
        console.log(data);
    }
});