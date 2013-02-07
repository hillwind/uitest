
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
                console.log(info)
                var doc = document;
                var safeInput = document.getElementById("J_SafeLoginCheck");
                var quick = document.getElementById("J_Quick2Static");
                if (safeInput && safeInput.checked) {
                    safeInput.click();
                    safeInput.checked = false;
                }
                if (quick)quick.click();
                var forms = doc ? doc.getElementsByTagName('form') : null;
                forms[0]['TPL_username'].value = info.username;
                forms[0]['TPL_password'].value = info.password;
                var button = document.getElementById("J_SubmitStatic");

                button.click();
                //forms[0].submit();

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