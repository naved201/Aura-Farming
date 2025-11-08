import './style.css'
import './navigationRail.css'
import './reviews.css'
import './app.css'
import { createApp, setupApp } from './app.js'

document.querySelector('#app').innerHTML = createApp()
setupApp()
