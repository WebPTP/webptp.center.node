var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'WebPTP连接中心' });
});

router.ws('/link', function (ws, req) {
  console.log("WS_已连接!", req.query);
  
  ws.send('HELLO');
  ws.on('message', function(msg) {
    ws.send(msg);
  });
});

module.exports = router;
