(function(){
  function single(sel,labelId){
    var lbl=labelId?document.getElementById(labelId):null,dot=document.getElementById('cdot');
    document.querySelectorAll(sel).forEach(function(b){b.addEventListener('click',function(){
      document.querySelectorAll(sel).forEach(function(x){x.classList.remove('on');x.setAttribute('aria-pressed','false');});
      b.classList.add('on');b.setAttribute('aria-pressed','true');
      if(lbl&&b.dataset.name)lbl.textContent=b.dataset.name;
      if(dot&&sel==='.swatch'&&b.dataset.color)dot.style.background=b.dataset.color;
    });});
  }
  single('.swatch','cname');single('.size',null);
})();
