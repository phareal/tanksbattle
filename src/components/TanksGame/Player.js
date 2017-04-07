/* eslint-disable no-unused-vars */

import Functions from './Functions.js'
import Bullet from './Bullet.js'
import BaseConfig from './BaseConfig.js'

let _positions = []
let isLocked = false
let xs = 0
let ys = 0
const releaseBots = false

export default class Player {
  constructor (gameInstanceP, playerIdP, teamP, containerP, isBotP) {
    this.GameInstance = gameInstanceP
    this.playerId = playerIdP
    this.team = teamP
    this.container = containerP
    this.isBot = isBotP
    this.resistance = this.team.resistance
    this.regenerateResistanceTimer = null
    this.randomActionsTimerInterval = Functions.rand(500, 500)
    this.botsActions = [
      BaseConfig.ACTIONS.ROTATE,
      BaseConfig.ACTIONS.SHOOT, BaseConfig.ACTIONS.SHOOT,
      BaseConfig.ACTIONS.MOVE, BaseConfig.ACTIONS.MOVE
    ]

    this.w = 40
    this.h = 45
    this.fW = this.w + 10
    this.fH = this.h + 5
    this.crop = (this.w * 30) / 100
    this.face = BaseConfig.ROTATEMAP[Functions.rand(0, BaseConfig.ROTATEMAP.length - 1)]
    this.moveCallbacks = []

    if (!this.isBot) {
      this.score = 0
    }

    this._draw()
  }

  updateScore (pts) {
    if (!this.isBot && pts > 0) {
      this.score += parseInt(pts)
    }
  }

  onMove (callback) {
    return this.moveCallbacks.push(callback)
  }

  offMove (index) {
    this.moveCallbacks = Functions.removeAt(this.moveCallbacks, (index - 1))
  }

  freeze () {
    clearInterval(this.randomActionsTimer)
  }

  unfreeze () {
    if (this.isBot) {
      this._inflateBotCapabilities()
    }
  }

  getFace () {
    return this.face
  }

  moveTo (xP, yP) {
    if (_positions.indexOf(xP + ':' + yP) === -1 && (xP !== -1 && yP !== -1) && (xP !== xs && yP !== ys)) {
      this._delAndUpdatePosition(xP, yP)
      if (this.moveCallbacks) {
        this._runCallbacks(this.moveCallbacks, this.getPosition())
      }
    }
  }

  _delAndUpdatePosition (xP, yP) {
    if (!isLocked) {
      isLocked = true

      _positions = Functions.removeAt(_positions, _positions.indexOf(this.x + ':' + this.y))
      this._updatePosition(xP, yP)

      isLocked = false
    } else {
      isLocked = true
    }
  }

  _updatePosition (xP, yP) {
    this.x = xP
    this.y = yP

    _positions.push(this.x + ':' + this.y)

    this.el.style.left = (this.x * this.fW) + 'px'
    this.el.style.top = (this.y * this.fH) + 'px'
  }

  rotate (deg) {
    if (BaseConfig.ROTATEMAP.indexOf(deg) > -1) {
      this.face = deg
      this._updateFace()
    }
  }

  getPosition () {
    return {
      x: this.x,
      y: this.y
    }
  }

  shootPrimary () {
    new Bullet('BULLET_' + this.playerId + '_001', this.container, this).acheminate()
  }

  getPunched (BulletInstance) {
    BulletInstance.inhibe()
    if (this.resistance !== BaseConfig.IMMORTAL_PLAYER_RESISTANCE) {
      if (--this.resistance === 0) {
        this._destroy()
        return true
      } else {
        this._punched()
        if (this.isBot) {
          this._injectRecoveryMode(BulletInstance)
        }
        return false
      }
    }
  }

  _smartPosition (xs, ys) {
    let x = Functions.rand(1, (xs - 1))
    let y = Functions.rand(1, (ys - 1))

    if (_positions.indexOf(x + ':' + y) > -1) {
      return this._smartPosition(xs, ys)
    } else {
      return [x, y]
    }
  }

  _draw () {
    xs = Functions.pxToNumber(this.container.style.width) / this.fW
    ys = Functions.pxToNumber(this.container.style.height) / this.fH
    let smartPosition = this._smartPosition(xs, ys)

    this.el = document.createElement('canvas')
    this.el.width = this.w
    this.el.height = this.h
    this.el.style.borderRadius = '0'
    this.el.style.boxShadow = this.team.color + ' 0px 10px 20px -5px'
    this.el.style.position = 'absolute'
    this.el.style.overflow = 'visible'
    this.el.style.zIndex = '99'
    this.el.style.border = '5px solid #FFF'
    this.el.style.borderTop = 'none'
    this.el.style.transition = 'all .2s ease-out 0s'
    this.el.setAttribute('id', this.playerId.toString().trim())
    this._updatePosition(smartPosition[0], smartPosition[1])
    this._updateFace()

    let ctx = this.el.getContext('2d')
    ctx.fillStyle = this.team.color
    ctx.fillRect(0, 0, this.w, this.h)
    ctx.clearRect(0, 0, this.crop, this.crop)
    ctx.clearRect(this.w - this.crop, 0, this.crop, this.crop)

    this.container.appendChild(this.el)
    this.unfreeze()
  }

  _inflateBotCapabilities () {
    if (releaseBots) {
      let PlayerInstance = this
      let actionId = Functions.rand(0, (PlayerInstance.botsActions.length - 1))
      PlayerInstance.randomActionsTimer = null

      let __run = () => {
        // Do action
        let actionParam = Functions.rand(0, BaseConfig.ROTATEMAP.length)
        switch (PlayerInstance.botsActions[actionId]) {
          case BaseConfig.ACTIONS.ROTATE:
            PlayerInstance.rotate(BaseConfig.ROTATEMAP[actionParam])
            break
          case BaseConfig.ACTIONS.SHOOT:
            PlayerInstance.shootPrimary()
            break
          case BaseConfig.ACTIONS.MOVE:
            if (actionParam === BaseConfig.ROTATEMAP.indexOf(BaseConfig.DIRECTIONS.TOP)) {
              PlayerInstance.moveTo(PlayerInstance.getPosition().x, (PlayerInstance.getPosition().y - 1))
              PlayerInstance.rotate(BaseConfig.DIRECTIONS.TOP)
            } else if (actionParam === BaseConfig.ROTATEMAP.indexOf(BaseConfig.DIRECTIONS.RIGHT)) {
              PlayerInstance.moveTo((PlayerInstance.getPosition().x + 1), PlayerInstance.getPosition().y)
              PlayerInstance.rotate(BaseConfig.DIRECTIONS.RIGHT)
            } else if (actionParam === BaseConfig.ROTATEMAP.indexOf(BaseConfig.DIRECTIONS.BOTTOM)) {
              PlayerInstance.moveTo(PlayerInstance.getPosition().x, (PlayerInstance.getPosition().y + 1))
              PlayerInstance.rotate(BaseConfig.DIRECTIONS.BOTTOM)
            } else if (actionParam === BaseConfig.ROTATEMAP.indexOf(BaseConfig.DIRECTIONS.LEFT)) {
              PlayerInstance.moveTo((PlayerInstance.getPosition().x - 1), PlayerInstance.getPosition().y)
              PlayerInstance.rotate(BaseConfig.DIRECTIONS.LEFT)
            }
            break
        }

        // , clear
        clearInterval(PlayerInstance.randomActionsTimer)
        PlayerInstance.randomActionsTimerInterval = Functions.rand(500, 1000)
        actionId = Functions.rand(0, (PlayerInstance.botsActions.length - 1))

        // and reRun
        PlayerInstance.randomActionsTimer = setInterval(__run, PlayerInstance.randomActionsTimerInterval)
      }

      PlayerInstance.randomActionsTimer = setInterval(__run, PlayerInstance.randomActionsTimerInterval)
    }
  }

  _updateFace () {
    this.el.style.transform = 'rotate(' + this.face + 'deg)'
  }

  _destroy () {
    let PlayerInstance = this

    clearInterval(PlayerInstance.randomActionsTimer)
    clearInterval(PlayerInstance.regenerateResistanceTimer)
    _positions = Functions.removeAt(_positions, _positions.indexOf(PlayerInstance.getPosition().x + ':' + PlayerInstance.getPosition().y))

    PlayerInstance.el.style.transform += 'scale(.01)'
    setTimeout(() => {
      PlayerInstance.el.remove()
    }, 200)
  }

  _refreshResistanceEffects () {
    if (this.resistance >= 0 && this.resistance !== BaseConfig.IMMORTAL_PLAYER_RESISTANCE) {
      this.el.style.opacity = (this.resistance * 1) / this.team.resistance
    }
  }

  _injectRecoveryMode (BulletInstance) {
    let dangerDirection = BaseConfig.ROTATEMAP[((BaseConfig.ROTATEMAP.indexOf(BulletInstance.direction) + 2) % BaseConfig.ROTATEMAP.length)]
    let safeZone = BaseConfig.ROTATEMAP[((BaseConfig.ROTATEMAP.indexOf(dangerDirection) + Functions.randInArray([-1, 1])) % BaseConfig.ROTATEMAP.length)]
    this.rotate(safeZone)
    switch (safeZone) {
      case BaseConfig.DIRECTIONS.TOP:
        this.moveTo(this.getPosition().x, (this.getPosition().y - Functions.randInArray([1, 2, 3])))
        break
      case BaseConfig.DIRECTIONS.RIGHT:
        this.moveTo((this.getPosition().x + Functions.randInArray([1, 2, 3])), this.getPosition().y)
        break
      case BaseConfig.DIRECTIONS.BOTTOM:
        this.moveTo(this.getPosition(), (this.getPosition().y + Functions.randInArray([1, 2, 3])))
        break
      case BaseConfig.DIRECTIONS.LEFT:
        this.moveTo((this.getPosition().x - Functions.randInArray([1, 2, 3])), this.getPosition().y)
        break
    }
    this.freeze()
    this.randomActionsTimerInterval = Functions.rand(0, 1)
    this.botsActions = [
      BaseConfig.ACTIONS.MOVE, BaseConfig.ACTIONS.MOVE, BaseConfig.ACTIONS.MOVE, BaseConfig.ACTIONS.MOVE, BaseConfig.ACTIONS.MOVE, BaseConfig.ACTIONS.MOVE,
      BaseConfig.ACTIONS.ROTATE, BaseConfig.ACTIONS.ROTATE,
      BaseConfig.ACTIONS.SHOOT
    ]
    this.unfreeze()
  }

  _injectNormalMode () {
    this.freeze()
    this.randomActionsTimerInterval = Functions.rand(1000, 1000)
    this.botsActions = [
      BaseConfig.ACTIONS.ROTATE, BaseConfig.ACTIONS.ROTATE, BaseConfig.ACTIONS.ROTATE,
      BaseConfig.ACTIONS.SHOOT, BaseConfig.ACTIONS.SHOOT, BaseConfig.ACTIONS.SHOOT, BaseConfig.ACTIONS.SHOOT, BaseConfig.ACTIONS.SHOOT,
      BaseConfig.ACTIONS.MOVE, BaseConfig.ACTIONS.MOVE, BaseConfig.ACTIONS.MOVE, BaseConfig.ACTIONS.MOVE, BaseConfig.ACTIONS.MOVE, BaseConfig.ACTIONS.MOVE, BaseConfig.ACTIONS.MOVE, BaseConfig.ACTIONS.MOVE, BaseConfig.ACTIONS.MOVE, BaseConfig.ACTIONS.MOVE
    ]
    this.unfreeze()
  }

  _punched () {
    let PlayerInstance = this

    clearInterval(PlayerInstance.regenerateResistanceTimer)
    PlayerInstance._refreshResistanceEffects()

    PlayerInstance.regenerateResistanceTimer = setInterval(() => {
      if (PlayerInstance.resistance < PlayerInstance.team.resistance) {
        PlayerInstance.resistance++
      } else {
        clearInterval(PlayerInstance.regenerateResistanceTimer)
        PlayerInstance._injectNormalMode()
      }
      PlayerInstance._refreshResistanceEffects()
    }, BaseConfig.TIME_TO_REGENERATE_RESISTANCE)
  }

  _runCallbacks (callbacks) {
    callbacks.forEach((callback, index) => {
      callback(arguments[1])
    })
  }
}