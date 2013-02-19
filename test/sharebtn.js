/*
 * des:分享按钮组件sharebtn组件jsamine测试用例代码。
 * author:longjun
 * */
//登录

UT.taobao.login("tbtest101", "taobao1234", true);
//打开测试demo页面进行测试
UT.open('http://i.daily.taobao.net/my_taobao.htm', function () {
    //组件测试代码
    describe('分享按钮组件sharebtn组件jsamine测试用例代码:UI测试', function () {
        $.getScript('http://a.tbcdn.cn/p/snsdk/core.js', function () {
            SNS.ui("sharebtn", {
                key:"1500007943876", // 16659645092
                type:"item",
                element:'#mytaobao',
                comment:Math.random() + '哈哈',
                callback:{
                }
            });
        });
        //组件UI显示测试
        it('显示sharebtn', function () {
            waitsMatchers(function () {
                expect(".sns-sharebtn").toExist();
                expect(".sns-sharebtn").toBeVisible();
            });
        });
        //用户行为测试
        //交互行为测试
        it('点击sharebtn', function () {
            runs(function () {
                simulate('.sns-sharebtn', 'click');
            });
            waitsMatchers(function () {
                expect(".sns-share-widget").toExist();
            }, 6000);

        });
    });
});


