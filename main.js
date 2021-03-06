import * as Terminal from './build/xterm';
import * as attach from './build/addons/attach/attach';
import * as fit from './build/addons/fit/fit';
import * as fullscreen from './build/addons/fullscreen/fullscreen';
import * as search from './build/addons/search/search';
import * as webLinks from './build/addons/webLinks/webLinks';
import * as winptyCompat from './build/addons/winptyCompat/winptyCompat';


Terminal.applyAddon(attach);
Terminal.applyAddon(fit);
Terminal.applyAddon(fullscreen);
Terminal.applyAddon(search);
Terminal.applyAddon(webLinks);
Terminal.applyAddon(winptyCompat);


var term,
    protocol,
    socketURL,
    socket,
    pid;

var terminalContainer = document.getElementById('terminal-container');
    // actionElements = {
    //   findNext: document.querySelector('#find-next'),
    //   findPrevious: document.querySelector('#find-previous')
    // },
    // paddingElement = document.getElementById('padding');

function setPadding() {
  term.element.style.padding = parseInt(paddingElement.value, 10).toString() + 'px';
  term.fit();
}

createTerminal();

const disposeRecreateButtonHandler = () => {
  // If the terminal exists dispose of it, otherwise recreate it
  if (term) {
    term.dispose();
    term = null;
    window.term = null;
    socket = null;
    document.getElementById('dispose').innerHTML = 'Recreate Terminal';
  }
  else {
    createTerminal();
    document.getElementById('dispose').innerHTML = 'Dispose terminal';
  }
};

// document.getElementById('dispose').addEventListener('click', disposeRecreateButtonHandler);

function createTerminal() {
  // Clean terminal
  while (terminalContainer.children.length) {
    terminalContainer.removeChild(terminalContainer.children[0]);
  }
  term = new Terminal({});
  window.term = term;  // Expose `term` to window for debugging purposes
  term.on('resize', function (size) {
    if (!pid) {
      return;
    }
    var cols = size.cols,
        rows = size.rows,
        url = '/terminals/' + pid + '/size?cols=' + cols + '&rows=' + rows;

    fetch(url, {method: 'POST'});
  });
  protocol = (location.protocol === 'https:') ? 'wss://' : 'ws://';
  socketURL = protocol + location.hostname + ((location.port) ? (':' + location.port) : '') + '/terminals/';

  term.open(terminalContainer);
  term.winptyCompatInit();
  term.webLinksInit();
  term.fit();
  term.focus();
  term.setOption("cols",200);
  term.setOption("rows",50);
  // 全屏
  // term.toggleFullScreen(true);

  var keycode = require('keycode');
  document.addEventListener('keydown', function(e) {
    // console.log("You pressed", keycode(e),e,e.keyCode,e.keyCode == '112', e.keyCode == '27')
    // F1 全屏
    if (e.keyCode == '112'){
      term.toggleFullScreen(true);
    }
    // ESC 退出
    if (e.keyCode == '27'){
      term.toggleFullScreen(false);
    }
  })
  
  // addDomListener(paddingElement, 'change', setPadding);

  // addDomListener(actionElements.findNext, 'keypress', function (e) {
  //   if (e.key === "Enter") {
  //     e.preventDefault();
  //     term.findNext(actionElements.findNext.value);
  //   }
  // });
  // addDomListener(actionElements.findPrevious, 'keypress', function (e) {
  //   if (e.key === "Enter") {
  //     e.preventDefault();
  //     term.findPrevious(actionElements.findPrevious.value);
  //   }
  // });

  // fit is called within a setTimeout, cols and rows need this.
  setTimeout(function () {
    initOptions(term);
    // document.getElementById(`opt-cols`).value = term.cols;
    // document.getElementById(`opt-rows`).value = term.rows;
    //paddingElement.value = 0;

    //document.getElementById(`pod`).value = term.pod

    // Set terminal size again to set the specific dimensions on the demo
    updateTerminalSize();

    fetch('/terminals?cols=' + term.cols + '&rows=' + term.rows+'&pod='+pod_name, {method: 'POST'}).then(function (res) {

      res.text().then(function (processId) {
        pid = processId;
        socketURL += processId;
        socket = new WebSocket(socketURL);
        socket.onopen = runRealTerminal;
        socket.onclose = runFakeTerminal;
        socket.onerror = runFakeTerminal;
      });
    });
  }, 0);
}

function runRealTerminal() {
  term.attach(socket);
  term._initialized = true;
}

function runFakeTerminal() {
  if (term._initialized) {
    return;
  }

  term._initialized = true;

  var shellprompt = '$ ';

  term.prompt = function () {
    term.write('\r\n' + shellprompt);
  };

  term.writeln('Welcome to xterm.js');
  term.writeln('This is a local terminal emulation, without a real terminal in the back-end.');
  term.writeln('Type some keys and commands to play around.');
  term.writeln('');
  term.prompt();

  term._core.register(term.addDisposableListener('key', function (key, ev) {
    var printable = (
      !ev.altKey && !ev.altGraphKey && !ev.ctrlKey && !ev.metaKey
    );

    if (ev.keyCode == 13) {
      term.prompt();
    } else if (ev.keyCode == 8) {
     // Do not delete the prompt
      if (term.x > 2) {
        term.write('\b \b');
      }
    } else if (printable) {
      term.write(key);
    } 
  }));

  term._core.register(term.addDisposableListener('paste', function (data, ev) {
    term.write(data);
  }));
}

function initOptions(term) {
  var blacklistedOptions = [
    // Internal only options
    'cancelEvents',
    'convertEol',
    'debug',
    'handler',
    'screenKeys',
    'termName',
    'useFlowControl',
    // Complex option
    'theme',
    // Only in constructor
    'rendererType'
  ];
  var stringOptions = {
    bellSound: null,
    bellStyle: ['none', 'sound'],
    cursorStyle: ['block', 'underline', 'bar'],
    experimentalCharAtlas: ['none', 'static', 'dynamic'],
    fontFamily: null,
    fontWeight: ['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900'],
    fontWeightBold: ['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900']
  };
  var options = Object.keys(term._core.options);
  var booleanOptions = [];
  var numberOptions = [];
  options.filter(o => blacklistedOptions.indexOf(o) === -1).forEach(o => {
    switch (typeof term.getOption(o)) {
      case 'boolean':
        booleanOptions.push(o);
        break;
      case 'number':
        numberOptions.push(o);
        break;
      default:
        if (Object.keys(stringOptions).indexOf(o) === -1) {
          console.warn(`Unrecognized option: "${o}"`);
        }
    }
  });

  // var html = '';
  // html += '<div class="option-group">';
  // booleanOptions.forEach(o => {
  //   html += `<div class="option"><label><input id="opt-${o}" type="checkbox" ${term.getOption(o) ? 'checked' : ''}/> ${o}</label></div>`;
  // });
  // html += '</div><div class="option-group">';
  // numberOptions.forEach(o => {
  //   html += `<div class="option"><label>${o} <input id="opt-${o}" type="number" value="${term.getOption(o)}"/></label></div>`;
  // });
  // html += '</div><div class="option-group">';
  // Object.keys(stringOptions).forEach(o => {
  //   if (stringOptions[o]) {
  //     html += `<div class="option"><label>${o} <select id="opt-${o}">${stringOptions[o].map(v => `<option ${term.getOption(o) === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label></div>`;
  //   } else {
  //     html += `<div class="option"><label>${o} <input id="opt-${o}" type="text" value="${term.getOption(o)}"/></label></div>`
  //   }
  // });
  // html += '</div>';

  var container = document.getElementById('options-container');
  //container.innerHTML = html;

  // Attach listeners
  // booleanOptions.forEach(o => {
  //   var input = document.getElementById(`opt-${o}`);
  //   addDomListener(input, 'change', () => {
  //     console.log('change', o, input.checked);
  //     term.setOption(o, input.checked);
  //   });
  // });
  // numberOptions.forEach(o => {
  //   var input = document.getElementById(`opt-${o}`);
  //   addDomListener(input, 'change', () => {
  //     console.log('change', o, input.value);
  //     if (o === 'cols' || o === 'rows') {
  //       updateTerminalSize();
  //     } else {
  //       term.setOption(o, parseInt(input.value, 10));
  //     }
  //   });
  // });
  // Object.keys(stringOptions).forEach(o => {
  //   var input = document.getElementById(`opt-${o}`);
  //   addDomListener(input, 'change', () => {
  //     console.log('change', o, input.value);
  //     term.setOption(o, input.value);
  //   });
  // });
}

var pod_name = "";

fetchPods();

function fetchPods(){
  fetch('/pods', {method: 'GET'}).then(function (res) {

    res.text().then(function (pods_name) {
      var t=document.getElementById("pods_tab");
      var rowNum=t.rows.length;
      for (i=0;i<rowNum;i++)
      {
          t.deleteRow(i);
          rowNum=rowNum-1;
          i=i-1;
      }
      var pods_name = JSON.parse(pods_name);
      for(var i in pods_name){
        var tr=t.insertRow(-1);
        var num=tr.insertCell(0);
        var name=tr.insertCell(1);
        num.innerHTML = i;
        name.innerHTML = pods_name[i];
      }
      addClickEvent();
    });
  });
}

function addClickEvent(){
  var rows=document.getElementById("pods_tab").rows;
  if(rows.length>0){
    for(var i=1;i<rows.length;i++){
      (function(i){
        var temp=rows[i].cells[1].innerText;
        var obj=rows[i];
        obj.onclick=function(){
          pod_name=temp;
          createTerminal();
        };
      })(i)
    }
  }
}

// function addDomListener(element, type, handler) {
//   element.addEventListener(type, handler);
//   term._core.register({ dispose: () => element.removeEventListener(type, handler) });
// }

function updateTerminalSize() {
  // var cols = parseInt(document.getElementById(`opt-cols`).value, 10);
  // var rows = parseInt(document.getElementById(`opt-rows`).value, 10);
  // var width = (cols * term._core.renderer.dimensions.actualCellWidth + term._core.viewport.scrollBarWidth).toString() + 'px';
  // var height = (rows * term._core.renderer.dimensions.actualCellHeight).toString() + 'px';
  // terminalContainer.style.width = width;
  // terminalContainer.style.height = height;
  term.fit();
}
