(function () {

    jQuery(document).ready(function () {
        var log = function(){
            if(window.console){
                window.console.log.apply(window.console, arguments)
            }
        }
        //避免iframe
        if (window != top) return;

        var stamp = location.href.match(/_ut_=(\d*)/) || window.name.match(/_ut_=(\d*)/);

        //检查id标识
        if (!stamp) {
            return;
        }
        //使用window.name来保存id信息。window.name页面刷新后不会改变
        window.name = stamp[0]


        var id = stamp[1];

        var canRun =true;
        var canNav = true;

        jQuery(window).unload(function () {
            canRun = false;
            canNav = false;
        });
        jQuery(window).bind("beforeunload", function () {
            canRun = false;
            canNav = false;
        })


        var socket = io.connect('http://localhost:8080', {
            'transports':[ 'jsonp-polling']
        });

        socket.on('connect', function () {
            socket.emit('register', {name:navigator.userAgent, id:id});
        })
        socket.on("navigator", function(data){
            log("navigator", data)
            canRun = false;
            switch(data.cmd){
                case "go":location.href =data.url;break;
                case "back":history.back();break;
                case "forward":history.forward();break;
                case "reload":history.reload();break;
            }

        })
        socket.on("start", function (data) {
            UT._socket = socket;
            //新开一个环境
            jasmine._newEnv = true;
            log("run", data.func)
            canRun = false;

            var error;
            try {

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

                    socket.emit('complete', result);


                });
            }
            // show reports();


        })

        socket.on("ask_canRun", function () {


            if(canRun) socket.emit('answer_canRun', true);
        })
        socket.on("ask_canNav", function () {


            if(canNav) socket.emit('answer_canNav', true);
        })


    })


})()