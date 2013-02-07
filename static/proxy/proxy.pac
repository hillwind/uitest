function FindProxyForURL(url,host) {
      if(/^https/.test(url)){
            return "DIRECT"
      }
      else{
         return "PROXY 127.0.0.1:8081"
      }
}