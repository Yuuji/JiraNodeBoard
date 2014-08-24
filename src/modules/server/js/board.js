$(function() {
    var socket = io('http://localhost:3010');

    socket.on('status', function(data) {
        console.log(data);
        switch(data.status) {
            case 'todo':
            case 'inprogress':
            case 'done':
                $('[data-tag=' + data.id + ']')
                        .removeClass('todo')
                        .removeClass('inprogress')
                        .removeClass('done')
                        .addClass(data.status);
                break;
        }
    });
});