# SimpleK8sWeb

## 安装及启动

```sh
npm install
npm install -g webpack webpack-cli
npm install --global --production windows-build-tools ### for windows
npm start
```


## 注意：

1. 部署的主机需要支持kubectl命令，能够访问k8s的资源。配置/root/.kube/config与/etc/kubernetes/admin/conf一致
2. 在app.js，修改你想要的kubectl命令
```js
app.post('/terminals', function (req, res) {
    ...
    term.write('kubectl exec -it -n test02 '+pod+' bash\r');
    ...
```