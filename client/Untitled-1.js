//index.js
//获取应用实例
var app = getApp()
Page({
  data: {
    motto: 'Hello World',
    userInfo: {},
    curIndex: 0

  },
  //事件处理函数
  bindViewTap: function () {
    wx.navigateTo({
      url: '../logs/logs'
    })
  },
  onLoad: function () {
    console.log('onLoad')
    var that = this
    //调用应用实例的方法获取全局数据
    app.getUserInfo(function (userInfo) {
      //更新数据
      that.setData({
        userInfo: userInfo,
        lastStep: ''
      })
    })


  },
  onReady: function () {
  },
  checkWxSession: function (success, fail, handleEvent) {
    var that = this;
    that.setData({
      curIndex: ++that.data.curIndex
    })
    console.log(that.data.curIndex + '检测微信小程序session')

    wx.checkSession({
      success: function () {
        success(null, that.generate3rdSession, handleEvent);
      },
      fail: function () {
        //登录态过期
        fail(handleEvent);
      }
    })
    this.data.lastStep = 'wxchecksession'
  },
  generate3rdSession: function (handleEvent) {
    var that = this;
    that.setData({
      curIndex: ++that.data.curIndex
    })
    console.log(that.data.curIndex + '微信登陆，生成第三方session')

    // 登录之后获取token 
    wx.login({
      success: function (res) {
        let loginCode = res.code;
        if (loginCode) {
          // 登录获取用户信息
          wx.getUserInfo({
            withCredentials: true,
            success: function (res) {
              wx.request({
                header: { cookie: 'wxtoke:null' },
                url: 'https://youngdze.co:8444/api/authorization', //仅为示例，并非真实的接口地址
                data: {
                  code: loginCode,
                  encryptedData: res.encryptedData,
                  signature: res.signature,
                  rawData: res.rawData,
                  iv: res.iv
                },
                header: {
                  'content-type': 'application/json'
                },
                success: function (res) {


                  console.log('生成第三方session,获取wxtoken');
                  wx.setStorage({
                    key: 'wxtoken',
                    data: res.data.wxtoken
                  })

                  that.check3rdSession(null, () => { console.log('接入微信登录时出错') }, handleEvent);
                }
              })

            }
          })
        }
      }
    })

    this.data.lastStep = 'generate3rdSession'
  },

  check3rdSession: function (success, fail, handleEvent) {

    let that = this;
    that.setData({
      curIndex: ++that.data.curIndex
    })
    console.log(that.data.curIndex + '第三方检测session')


    wx.getStorage({
      key: 'wxtoken',
      success: function (res) {
        let wxtoken = res.data;
        if (wxtoken) {
          console.log('成功获取token');
          handleEvent();
        } else {
          fail(handleEvent);
        }
      }
    })

    this.data.lastStep = 'check3rdsession'
  },

  login: function () {
    var that = this;

    //清除wxtoken
    wx.setStorage({
      key: 'wxtoken',
      data: ''
    })

    



    that.checkWxSession(that.check3rdSession, that.generate3rdSession, function () {
      console.log('正式处理问题');
    });

  },
})
