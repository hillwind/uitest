 var win = UT.open("http://www.taobao.com", function () {
        describe("this is a simple test of uitest", function () {
            it("it is always right", function () {
                expect(1).toBe(1);
            })
        })
    })
    /*
     win.go(function () {
     describe("class", function () {
     it("has class", function () {
     expect("#target").toHaveClass("ok");

     })
     })
     })
     */