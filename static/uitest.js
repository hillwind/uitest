(function () {
    console.log(jQuery.ready)
    jQuery(document).ready(function () {
        console.log("ready")
        //避免iframe
        if (window != top) return;

        var stamp = location.href.match(/_ut_=(\d*)/) || window.name.match(/_ut_=(\d*)/);
        console.log(stamp)
        //检查id标识
        if (!stamp) {
            return;
        }
        //使用window.name来保存id信息。window.name页面刷新后不会改变
        window.name = stamp[0]


        var id = stamp[1];

        var canAnswer =true;
        jQuery(window).unload(function () {
            canAnswer = false;
        });
        jQuery(window).bind("beforeunload", function () {
            canAnswer = false;
        })

        console.log("stamp", stamp)
        var socket = io.connect('http://localhost:8080', {
            'transports':[ 'jsonp-polling']
        });

        socket.on('connect', function () {
            console.log("register", id)

            socket.emit('register', {name:navigator.userAgent, id:id});
        })
        socket.on("navigator", function(data){
            canAnswer = false;
            switch(data.cmd){
                case "go":location.href =data.url;break;
                case "back":history.back();break;
                case "forward":history.forward();break;
                case "reload":history.reload();break;
            }
            socket.emit('complete', {});
        })
        socket.on("start", function (data) {
            UT._socket = socket;
            //新开一个环境
            jasmine._newEnv = true;
            canAnswer = false;
            var error;
            try {
                console.log("run.....")
                /* if (window.alert)window.alert = function () {
                 };
                 if (window.confirm)window.confirm = function () {
                 return true
                 };
                 */
                eval(data.func);


            } catch (e) {

                error = {};
                error.message = e.message;
                error.type = e.type;
                error.stack = e.stack;


            } finally {
                UT.execute(function (result) {
                    if (error) {
                        result.errors = result.errors || [];
                        result.errors.push(error);
                    }
                    console.log("complete",result)
                    socket.emit('complete', result);

                });
            }
            // show reports();


        })

        socket.on("isok", function () {
            console.log("ok")
            if(canAnswer) socket.emit('ok');
        })


    })


})()