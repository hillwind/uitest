//宝贝ID分别对应：无SKU、多SKU、家装, 服务、3C服务、区域限售
//9032525794
var item_sku = [14747655233, 16528243657, 10711246376, 16725177098];

UT.taobao.login("c测试账号195", "taobao1234");
for (var ii = 0; ii < item_sku.length; ii++) {
    var win = UT.open("http://detail.tmall.com/item.htm?id=" + item_sku[ii], function () {
        describe("登录用户点击立即购买,跳转到交易下单", function () {
            var sku_num = $(".tb-sku .tb-prop").length;
            //var delayTime = 2000;
            if (sku_num > 0) {

                it("未登录购买宝贝", function () {
                    select_sku(sku_num);
                    buyatnow();
                });
            }
            else if (sku_num > 0) {
                it("sku浮层购买", function () {
                    select_sku_layout(sku_num);
                });
            }
            else {
                it("无SKU购买宝贝", function () {
                    buyatnow();
                });
            }
        });

        //sku选择
        function select_sku(skunum) {


        }

        //sku 浮层选择
        function select_sku_layout(skunum) {
            $(document).ready(function () {
                //取消sku选中
                for (i = 0; i < skunum; i++) {
                    //div[class='tb-key\\ tb-key-sku']  tb-skin tb-naked
                    var sku_pv = $("div[class='tb-skin\\ tb-naked'] div[class='tb-sku'] ul[class^='tb-clearfix\\ J_TSaleProp']:eq(" + i + ") li a");
                    var sku = $("div[class='tb-skin\\ tb-naked'] div[class='tb-sku'] ul[class^='tb-clearfix\\ J_TSaleProp']:eq(" + i + ") li");
                    for (j = 0; j < sku.length; j++) {
                        if ($(sku[j]).hasClass("tb-selected")) {
                            jasmine.simulate(sku_pv[j], 'click');
                            break;
                        }
                    }
                }
                //立即购买
                jasmine.simulate($("a#J_LinkBuy.tb-act"), 'click');
                //sku浮层,选择sku
                for (i = 0; i < skunum; i++) {
                    //alert("i2  "+i);//div[class='tb-key\\ tb-key-sku']
                    var sku_pv = $("ul[class^='tb-clearfix\\ J_TSaleProp']:eq(" + i + ") li a");
                    var sku = $("ul[class^='tb-clearfix\\ J_TSaleProp']:eq(" + i + ") li");
                    if (sku.length === 0) {
                        expect("没有获取sku值").toBe();
                    } else {
                        for (j = 0; j < sku.length; j++) {
                            if ($(sku[j]).hasClass("tb-out-of-stock")) {
                                continue;
                            }
                            jasmine.simulate(sku_pv[j], 'click');
                            break;
                        }
                    }
                }
                //点击确定按钮
                var tbn_ok = $("a#J_LinkBuy.tb-act tb-btn-inbox");
                simulate($(tbn_ok), 'click');

            });

        }

        // 点击立即购买按钮，等待加载，延迟2s点击
        function buyatnow() {


        }
    });


}
