
UT.setData({
    username:"伯飞",
    password:"hello1234"
})
var win = UT.open("http://login.taobao.com/member/login.jhtml?from=buy&full_redirect=false&redirect_url=http://www.taobao.com/go/act/uitest/login.php", function () {
    describe("登录", function () {
        it("获取数据并提交登录", function () {
            var info;

            getData(function (data) {
                info = data;
            });

            waitsMathers(function () {

                expect(info).toBeDefined();
            });

            runs(function () {




                if(jQuery("#J_QuickLogin").css("display")!="none"){
                    var quick = jQuery("#J_Quick2Static");
                    if (quick[0])quick[0].click();
                }
                var safeInput = jQuery("#J_SafeLoginCheck");
                if (safeInput[0] && safeInput[0].checked) {
                    safeInput[0].click();
                    safeInput[0].checked = false;
                }


                var form =jQuery('form')[0];

                form['TPL_username'].value = info.username;
                form['TPL_password'].value = info.password;
                var button = jQuery("#J_SubmitStatic")[0];
                button.click();
              //  forms[0].submit();

            })




        })
    })


})
win.ready(function () {
    describe("登录", function () {
        it("判断登录跳转成功", function () {
            waitsMathers(function () {
                expect(window.loginsuccess).toBeDefined();
            })
        })
    })
})