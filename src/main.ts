import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { icons } from './icons'
import { applyLang, initialLang, t, type Lang } from './i18n'

gsap.registerPlugin(ScrollTrigger)

// No celular a barra de endereço some e volta ao rolar; isso não deve recalcular
// as animações (evita saltos). O toque continua com a rolagem nativa, que é a mais fluida.
ScrollTrigger.config({ ignoreMobileResize: true })

// Ao recarregar, começa sempre do topo, onde está a animação de entrada.
history.scrollRestoration = 'manual'
window.scrollTo(0, 0)

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches
document.documentElement.classList.toggle('has-mouse', finePointer)

// ---------- Ícones ----------
function fillIcons(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-icon]').forEach((el) => {
    const svg = icons[el.dataset.icon ?? '']
    if (svg) el.innerHTML = svg
  })
}

const stack: [icon: string, name: string][] = [
  ['javascript', 'JavaScript'],
  ['typescript', 'TypeScript'],
  ['react', 'React'],
  ['nodedotjs', 'Node.js'],
  ['html5', 'HTML'],
  ['css', 'CSS'],
  ['tailwindcss', 'Tailwind CSS'],
  ['fastify', 'Fastify'],
  ['sqlite', 'SQLite'],
  ['supabase', 'Supabase'],
  ['git', 'Git'],
  ['github', 'GitHub'],
  ['vite', 'Vite'],
]

function buildStack(): void {
  const host = document.getElementById('stack')
  if (!host) return
  // A faixa é duplicada para o loop infinito; a cópia fica escondida dos leitores de tela.
  const row = (hidden: boolean) =>
    `<ul class="stack__row"${hidden ? ' aria-hidden="true"' : ''}>${stack
      .map(([icon, name]) => `<li class="stack__item">${icons[icon]}<span>${name}</span></li>`)
      .join('')}</ul>`
  host.innerHTML = `<div class="stack__track">${row(false)}${row(true)}</div>`
}

// ---------- Texto palavra por palavra ----------
function splitWords(): void {
  document.querySelectorAll<HTMLElement>('[data-split]').forEach((el) => {
    const words = (el.textContent ?? '').trim().split(/\s+/)
    el.innerHTML = words.map((w) => `<span class="word">${w}</span>`).join(' ')
  })
}

// ---------- Rolagem suave ----------
let lenis: Lenis | null = null
if (!reduceMotion) {
  lenis = new Lenis({ anchors: true, lerp: 0.1 })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => lenis?.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)
}

// ---------- Animações ligadas à rolagem ----------
function buildScroll(): gsap.Context {
  return gsap.context(() => {
    if (!reduceMotion) buildMotion()

    // Menu: destaca a seção atual (vale também com movimento reduzido).
    // Criado depois do lema fixado, para as posições já contarem o espaço do "pin".
    const groups: [string, string][] = [
      ['#about', 'about'],
      ['.do', 'about'],
      ['.journey', 'about'],
      ['#work', 'work'],
      ['#services', 'services'],
      ['#motto', 'services'],
      ['#contact', 'contact'],
    ]
    groups.forEach(([selector, name]) => {
      ScrollTrigger.create({
        trigger: selector,
        start: 'top 55%',
        end: 'bottom 55%',
        onToggle: (self) => self.isActive && setActiveNav(name),
      })
    })
    ScrollTrigger.create({
      trigger: '.hero',
      start: 'top top',
      end: 'bottom 55%',
      onToggle: (self) => self.isActive && setActiveNav(''),
    })
  })
}

function buildMotion(): void {
    // Foto do hero afasta e escurece ao rolar.
    gsap.to('.hero__photo img', {
      scale: 1.12,
      opacity: 0.25,
      ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
    })

    // "Sobre mim": cada palavra acende conforme a rolagem.
    gsap.fromTo(
      '.about .word',
      { opacity: 0.15 },
      {
        opacity: 1,
        stagger: 0.05,
        ease: 'none',
        scrollTrigger: { trigger: '.about', start: 'top 75%', end: 'bottom 60%', scrub: true },
      },
    )

    gsap.utils.toArray<HTMLElement>('.do__item, .journey__row, .card, .section__title, .contact__title, .services__title, .service, .step, .services__cta').forEach((el) => {
      gsap.from(el, {
        y: 40,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%' },
      })
    })

    // Linha do tempo: a barra laranja cresce com a rolagem.
    gsap.fromTo(
      '.journey__list',
      { '--p': 0 },
      {
        '--p': 1,
        ease: 'none',
        scrollTrigger: { trigger: '.journey__list', start: 'top 70%', end: 'bottom 60%', scrub: true },
      },
    )

    // Lema: uma palavra por vez, com a seção presa na tela.
    const tl = gsap.timeline({
      scrollTrigger: { trigger: '.motto', start: 'top top', end: '+=120%', scrub: true, pin: true, anticipatePin: 1 },
    })
    tl.fromTo('.motto .reveal__front .motto__word', { opacity: 0.12 }, { opacity: 1, stagger: 0.5, duration: 0.5 })
}

function setActiveNav(name: string): void {
  document.querySelectorAll<HTMLElement>('[data-nav]').forEach((a) => {
    a.classList.toggle('is-active', a.dataset.nav === name)
  })
}

// ---------- Idioma ----------
let lang: Lang = initialLang()
let scrollCtx: gsap.Context | null = null

function setLang(next: Lang): void {
  lang = next
  scrollCtx?.revert()
  applyLang(lang)
  // A mensagem do formulário não usa data-i18n; limpa para não ficar no idioma antigo.
  const status = document.getElementById('form-status')
  if (status) {
    status.textContent = ''
    delete status.dataset.state
  }
  splitWords()
  scrollCtx = buildScroll()
  ScrollTrigger.refresh()
}

document.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const next = btn.dataset.lang as Lang
    if (next !== lang) setLang(next)
  })
})

// ---------- Cursor e revelação da versão sincera ----------
const cursor = document.getElementById('cursor') as HTMLElement
const reveals = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'))
const REVEAL_R = 150
const pointer = { x: -100, y: -100 }
const dot = { x: -100, y: -100 }
let active: HTMLElement | null = null

function setOrigin(el: HTMLElement, x: number, y: number): void {
  const rect = el.getBoundingClientRect()
  el.style.setProperty('--x', `${x - rect.left}px`)
  el.style.setProperty('--y', `${y - rect.top}px`)
}

function open(el: HTMLElement, radius: number): void {
  gsap.to(el, { '--r': `${radius}px`, duration: reduceMotion ? 0 : 0.5, ease: 'power3.out', overwrite: 'auto' })
}

function close(el: HTMLElement): void {
  gsap.to(el, { '--r': '0px', duration: reduceMotion ? 0 : 0.4, ease: 'power3.inOut', overwrite: 'auto' })
  el.classList.remove('is-open')
}

if (finePointer) {
  window.addEventListener('pointermove', (e) => {
    pointer.x = e.clientX
    pointer.y = e.clientY
  })

  reveals.forEach((el) => {
    el.addEventListener('pointerenter', () => {
      active = el
      setOrigin(el, pointer.x, pointer.y)
      open(el, REVEAL_R)
      cursor.classList.add('is-hidden')
    })
    el.addEventListener('pointerleave', () => {
      if (active === el) active = null
      close(el)
      cursor.classList.remove('is-hidden')
    })
  })

  gsap.ticker.add(() => {
    const ease = reduceMotion ? 1 : 0.2
    dot.x += (pointer.x - dot.x) * ease
    dot.y += (pointer.y - dot.y) * ease
    cursor.style.transform = `translate3d(${dot.x}px, ${dot.y}px, 0)`
    // O círculo segue o ponteiro mesmo enquanto a página rola.
    if (active) setOrigin(active, dot.x, dot.y)
  })
} else {
  // Toque: abre um círculo no centro do bloco, grande o bastante para mostrar todo o texto; outro toque fecha.
  reveals.forEach((el) => {
    el.addEventListener('click', () => {
      if (el.classList.contains('is-open')) {
        close(el)
        return
      }
      const rect = el.getBoundingClientRect()
      el.style.setProperty('--x', `${rect.width / 2}px`)
      el.style.setProperty('--y', `${rect.height / 2}px`)
      el.classList.add('is-open')
      open(el, Math.hypot(rect.width, rect.height) / 2 + 16)
    })
  })
}

// ---------- Barra "carregando skills" (nunca chega a 100%) ----------
function runProgress(): void {
  const fill = document.getElementById('progress-fill')
  const num = document.getElementById('progress-num')
  if (!fill || !num) return
  const state = { v: 0 }
  const render = () => {
    fill.style.width = `${state.v}%`
    num.textContent = `${Math.round(state.v)}%`
  }
  if (reduceMotion) {
    state.v = 87
    render()
    return
  }
  gsap.to(state, {
    v: 87,
    duration: 2.4,
    delay: 0.6,
    ease: 'power2.out',
    onUpdate: render,
    onComplete: () => {
      // Fica "quase pronto" para sempre, porque aprender não termina.
      const wiggle = () =>
        gsap.to(state, { v: gsap.utils.random(88, 99, 1), duration: 1.2, ease: 'power1.inOut', onUpdate: render, onComplete: () => gsap.delayedCall(gsap.utils.random(1.5, 3.5), wiggle) })
      gsap.delayedCall(1.5, wiggle)
    },
  })
}

// ---------- Entrada do hero ao abrir a página ----------
function playHeroIntro(): void {
  runProgress()
  const reveal = () => document.documentElement.classList.remove('is-loading')
  if (reduceMotion) {
    reveal()
    return
  }

  // Os from() abaixo já aplicam o estado inicial (invisível) ao serem criados;
  // só então o hero deixa de estar escondido, então nada pisca.
  gsap
    .timeline({ onStart: reveal })
    .from('.hero__photo img', { scale: 1.15, opacity: 0, duration: 1.6, ease: 'power3.out' }, 0)
    .from('.hero__title.reveal__front .line > span', { yPercent: 110, duration: 1, stagger: 0.09, ease: 'power4.out' }, 0.25)
    .from('.hero__meta > *', { y: 20, opacity: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' }, 0.7)
    .from('.topbar, .side-social, .side-status', { opacity: 0, duration: 0.8 }, 0.8)
}

// ---------- "Pedir orçamento": já escolhe o serviço no formulário ----------
const topicSelect = document.getElementById('form-topic') as HTMLSelectElement | null
document.querySelectorAll<HTMLAnchorElement>('[data-service]').forEach((a) => {
  a.addEventListener('click', () => {
    if (topicSelect && a.dataset.service) topicSelect.value = a.dataset.service
  })
})

// ---------- Formulário (Formspree) ----------
const FORMSPREE_ID = import.meta.env.VITE_FORMSPREE_ID as string | undefined

const form = document.getElementById('contact-form') as HTMLFormElement | null
const statusEl = document.getElementById('form-status')

form?.addEventListener('submit', async (e) => {
  e.preventDefault()
  if (!statusEl) return
  if (!form.reportValidity()) return
  if (!FORMSPREE_ID) {
    statusEl.textContent = t(lang, 'form.off')
    statusEl.dataset.state = 'error'
    return
  }

  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')
  const label = form.querySelector<HTMLElement>('.form__send-text')
  button?.setAttribute('disabled', '')
  if (label) label.textContent = t(lang, 'form.sending')
  statusEl.textContent = ''
  delete statusEl.dataset.state

  try {
    const res = await fetch(`https://formspree.io/f/${encodeURIComponent(FORMSPREE_ID)}`, {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) throw new Error(String(res.status))
    form.reset()
    statusEl.textContent = t(lang, 'form.ok')
    statusEl.dataset.state = 'ok'
  } catch {
    statusEl.textContent = t(lang, 'form.error')
    statusEl.dataset.state = 'error'
  } finally {
    button?.removeAttribute('disabled')
    if (label) label.textContent = t(lang, 'form.send')
  }
})

// ---------- Início ----------
fillIcons()
buildStack()
setLang(lang)
playHeroIntro()
