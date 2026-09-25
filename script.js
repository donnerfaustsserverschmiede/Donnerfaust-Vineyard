const toggle=document.querySelector('.menu-toggle');
const nav=document.querySelector('.nav');
if(toggle){
  toggle.addEventListener('click',()=>{
    const open=nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded',open);
  });
}
document.querySelectorAll('.nav a').forEach(link=>{
  link.addEventListener('click',()=>nav.classList.remove('open'));
});
const observer=new IntersectionObserver(entries=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting) entry.target.classList.add('visible');
  });
},{threshold:.12});
document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));
