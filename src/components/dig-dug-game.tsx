import { useEffect, useRef, useCallback } from 'react'
import { analytics } from '@/lib/analytics'

// Grid dimensions
const COLS = 15
const ROWS = 12
const CELL_SIZE = 32
const WIDTH = COLS * CELL_SIZE
const HEIGHT = ROWS * CELL_SIZE

// Colors
const COLOR_BG = '#1a0a00'
const COLOR_DIRT = '#8B5E3C'
const COLOR_DIRT_DARK = '#6B4226'
const COLOR_DIRT_LIGHT = '#A0703C'
const COLOR_PLAYER = '#3B82F6'
const COLOR_PLAYER_EYE = '#fff'
const COLOR_ENEMY = '#EF4444'
const COLOR_ENEMY_EYE = '#fff'
const COLOR_TUNNEL = '#2C1810'
const COLOR_SCORE = '#FFD700'
const COLOR_GAMEOVER_BG = 'rgba(0, 0, 0, 0.75)'

interface Pos {
  x: number
  y: number
}

interface Enemy {
  x: number
  y: number
  paceDir: 1 | -1 // horizontal pacing direction
  lastMove: number // individual move timestamp
  moveInterval: number // ms between moves (varies per enemy)
}

type Cell = 'dirt' | 'empty'

function createGame(): { grid: Cell[][]; enemies: Enemy[] } {
  const grid: Cell[][] = []
  for (let y = 0; y < ROWS; y++) {
    grid[y] = []
    for (let x = 0; x < COLS; x++) {
      grid[y][x] = 'dirt'
    }
  }
  // Clear starting area (top-center)
  const startX = Math.floor(COLS / 2)
  const startY = 1
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const ny = startY + dy
      const nx = startX + dx
      if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) {
        grid[ny][nx] = 'empty'
      }
    }
  }

  // Spawn 3 enemies immediately in their own pockets
  const player = { x: startX, y: startY }
  const enemies: Enemy[] = []
  for (let i = 0; i < 3; i++) {
    const enemy = spawnEnemy(grid, player, enemies)
    if (enemy) enemies.push(enemy)
  }

  return { grid, enemies }
}

// Simple BFS pathfinding through empty cells
function findPath(grid: Cell[][], from: Pos, to: Pos): Pos | null {
  if (from.x === to.x && from.y === to.y) return null

  const visited = new Set<string>()
  const queue: Array<{ pos: Pos; firstStep: Pos | null }> = [
    { pos: from, firstStep: null },
  ]
  visited.add(`${from.x},${from.y}`)

  const dirs = [
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
  ]

  while (queue.length > 0) {
    const current = queue.shift()!
    for (const dir of dirs) {
      const nx = current.pos.x + dir.x
      const ny = current.pos.y + dir.y
      const key = `${nx},${ny}`

      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue
      if (visited.has(key)) continue
      if (grid[ny][nx] !== 'empty') continue

      visited.add(key)
      const firstStep = current.firstStep || { x: nx, y: ny }

      if (nx === to.x && ny === to.y) {
        return firstStep
      }

      queue.push({ pos: { x: nx, y: ny }, firstStep })
    }
  }

  return null
}

// Spawn an enemy at a random position with a 3-wide pocket (1 empty on each side)
// Avoids spawning near the player or other enemies
function spawnEnemy(grid: Cell[][], player: Pos, existing: Enemy[]): Enemy | null {
  for (let attempt = 0; attempt < 50; attempt++) {
    const x = 1 + Math.floor(Math.random() * (COLS - 2)) // avoid edges so pocket fits
    const y = 4 + Math.floor(Math.random() * (ROWS - 5)) // bottom ~2/3 of grid

    // Must be far enough from player
    const dist = Math.abs(x - player.x) + Math.abs(y - player.y)
    if (dist < 6) continue

    // Must be far enough from other enemies
    const tooClose = existing.some(e => Math.abs(x - e.x) + Math.abs(y - e.y) < 4)
    if (tooClose) continue

    // Check that the 3-wide pocket area is currently all dirt (untouched)
    if (x - 1 < 0 || x + 1 >= COLS) continue
    if (grid[y][x - 1] !== 'dirt' || grid[y][x] !== 'dirt' || grid[y][x + 1] !== 'dirt') continue

    // Clear the 3-wide pocket
    grid[y][x - 1] = 'empty'
    grid[y][x] = 'empty'
    grid[y][x + 1] = 'empty'

    // Each enemy gets a slightly different move speed (300–450ms)
    return { x, y, paceDir: Math.random() < 0.5 ? 1 : -1, lastMove: 0, moveInterval: 300 + Math.floor(Math.random() * 150) }
  }
  return null
}

export function DigDugGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const initialGame = createGame()
  const stateRef = useRef({
    grid: initialGame.grid,
    player: { x: Math.floor(COLS / 2), y: 1 } as Pos,
    enemies: initialGame.enemies,
    score: 0,
    gameOver: false,
    won: false,
    animFrame: 0,
  })
  const keysRef = useRef(new Set<string>())
  const rafRef = useRef<number>(0)
  const lastMoveRef = useRef(0)

  const resetGame = useCallback(() => {
    const s = stateRef.current
    const fresh = createGame()
    s.grid = fresh.grid
    s.player = { x: Math.floor(COLS / 2), y: 1 }
    s.enemies = fresh.enemies
    s.score = 0
    s.gameOver = false
    s.won = false
    s.animFrame = 0
    lastMoveRef.current = 0
  }, [])

  const drawGame = useCallback((ctx: CanvasRenderingContext2D) => {
    const s = stateRef.current
    s.animFrame++

    // Background
    ctx.fillStyle = COLOR_BG
    ctx.fillRect(0, 0, WIDTH, HEIGHT)

    // Draw grid
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const px = x * CELL_SIZE
        const py = y * CELL_SIZE
        if (s.grid[y][x] === 'dirt') {
          // Dirt with pixel texture
          ctx.fillStyle = COLOR_DIRT
          ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE)
          // Add some texture dots
          ctx.fillStyle = COLOR_DIRT_DARK
          ctx.fillRect(px + 4, py + 4, 3, 3)
          ctx.fillRect(px + 20, py + 12, 3, 3)
          ctx.fillRect(px + 10, py + 22, 3, 3)
          ctx.fillStyle = COLOR_DIRT_LIGHT
          ctx.fillRect(px + 14, py + 6, 2, 2)
          ctx.fillRect(px + 6, py + 18, 2, 2)
          ctx.fillRect(px + 24, py + 24, 2, 2)
          // Grid lines
          ctx.strokeStyle = COLOR_DIRT_DARK
          ctx.lineWidth = 0.5
          ctx.strokeRect(px, py, CELL_SIZE, CELL_SIZE)
        } else {
          // Tunnel
          ctx.fillStyle = COLOR_TUNNEL
          ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE)
        }
      }
    }

    // Draw player (blue circle with eyes)
    const pp = s.player
    const ppx = pp.x * CELL_SIZE + CELL_SIZE / 2
    const ppy = pp.y * CELL_SIZE + CELL_SIZE / 2
    ctx.fillStyle = COLOR_PLAYER
    ctx.beginPath()
    ctx.arc(ppx, ppy, CELL_SIZE / 2 - 3, 0, Math.PI * 2)
    ctx.fill()
    // Eyes
    ctx.fillStyle = COLOR_PLAYER_EYE
    ctx.beginPath()
    ctx.arc(ppx - 4, ppy - 3, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(ppx + 4, ppy - 3, 3, 0, Math.PI * 2)
    ctx.fill()
    // Pupils
    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.arc(ppx - 4, ppy - 3, 1.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(ppx + 4, ppy - 3, 1.5, 0, Math.PI * 2)
    ctx.fill()

    // Draw enemies (red blobs with eyes)
    for (const e of s.enemies) {
      const ex = e.x * CELL_SIZE + CELL_SIZE / 2
      const ey = e.y * CELL_SIZE + CELL_SIZE / 2
      // Blob body with wobbly effect
      const wobble = Math.sin(s.animFrame * 0.1) * 1.5
      ctx.fillStyle = COLOR_ENEMY
      ctx.beginPath()
      ctx.arc(ex, ey, CELL_SIZE / 2 - 3 + wobble, 0, Math.PI * 2)
      ctx.fill()
      // Eyes
      ctx.fillStyle = COLOR_ENEMY_EYE
      ctx.beginPath()
      ctx.arc(ex - 4, ey - 2, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(ex + 4, ey - 2, 3, 0, Math.PI * 2)
      ctx.fill()
      // Angry pupils (looking at player)
      const dx = pp.x - e.x
      const dy = pp.y - e.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const lookX = (dx / dist) * 1.5
      const lookY = (dy / dist) * 1.5
      ctx.fillStyle = '#000'
      ctx.beginPath()
      ctx.arc(ex - 4 + lookX, ey - 2 + lookY, 1.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(ex + 4 + lookX, ey - 2 + lookY, 1.5, 0, Math.PI * 2)
      ctx.fill()
    }

    // Score
    ctx.fillStyle = COLOR_SCORE
    ctx.font = 'bold 16px monospace'
    ctx.textAlign = 'left'
    ctx.fillText(`SCORE: ${s.score}`, 8, 20)

    // Game over overlay
    if (s.gameOver) {
      ctx.fillStyle = COLOR_GAMEOVER_BG
      ctx.fillRect(0, 0, WIDTH, HEIGHT)
      ctx.fillStyle = COLOR_ENEMY
      ctx.font = 'bold 32px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('GAME OVER', WIDTH / 2, HEIGHT / 2 - 30)
      ctx.fillStyle = COLOR_SCORE
      ctx.font = 'bold 24px monospace'
      ctx.fillText(`SCORE: ${s.score}`, WIDTH / 2, HEIGHT / 2 + 10)
      ctx.fillStyle = '#ccc'
      ctx.font = '14px monospace'
      ctx.fillText('Press any key to restart', WIDTH / 2, HEIGHT / 2 + 50)
    }

    // Win overlay
    if (s.won) {
      ctx.fillStyle = COLOR_GAMEOVER_BG
      ctx.fillRect(0, 0, WIDTH, HEIGHT)
      ctx.fillStyle = COLOR_SCORE
      ctx.font = 'bold 32px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('YOU WIN!', WIDTH / 2, HEIGHT / 2 - 30)
      ctx.fillStyle = COLOR_PLAYER
      ctx.font = 'bold 24px monospace'
      ctx.fillText(`SCORE: ${s.score}`, WIDTH / 2, HEIGHT / 2 + 10)
      ctx.fillStyle = '#ccc'
      ctx.font = '14px monospace'
      ctx.fillText('Press any key to restart', WIDTH / 2, HEIGHT / 2 + 50)
    }
  }, [])

  const gameLoop = useCallback(
    (timestamp: number) => {
      const ctx = canvasRef.current?.getContext('2d')
      if (!ctx) return

      const s = stateRef.current

      if (!s.gameOver && !s.won) {
        // Player movement (~120ms between moves for snappy feel)
        if (timestamp - lastMoveRef.current > 120) {
          const keys = keysRef.current
          let dx = 0
          let dy = 0
          if (keys.has('ArrowUp') || keys.has('w')) dy = -1
          else if (keys.has('ArrowDown') || keys.has('s')) dy = 1
          else if (keys.has('ArrowLeft') || keys.has('a')) dx = -1
          else if (keys.has('ArrowRight') || keys.has('d')) dx = 1

          if (dx !== 0 || dy !== 0) {
            const nx = s.player.x + dx
            const ny = s.player.y + dy
            if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS) {
              // Dig through dirt
              if (s.grid[ny][nx] === 'dirt') {
                s.grid[ny][nx] = 'empty'
                s.score++
              }
              s.player.x = nx
              s.player.y = ny
              lastMoveRef.current = timestamp
            }
          }
        }

        // Move enemies (each on its own timer)
        for (const enemy of s.enemies) {
          if (timestamp - enemy.lastMove < enemy.moveInterval) continue
          enemy.lastMove = timestamp

          // Try BFS pathfinding to player through empty cells
          const nextStep = findPath(s.grid, enemy, s.player)
          if (nextStep) {
            // Path exists — chase the player
            enemy.x = nextStep.x
            enemy.y = nextStep.y
          } else {
            // No path — pace back and forth horizontally
            const nx = enemy.x + enemy.paceDir
            if (nx >= 0 && nx < COLS && s.grid[enemy.y][nx] === 'empty') {
              enemy.x = nx
            } else {
              // Reverse direction and step
              enemy.paceDir = (enemy.paceDir * -1) as 1 | -1
              const rx = enemy.x + enemy.paceDir
              if (rx >= 0 && rx < COLS && s.grid[enemy.y][rx] === 'empty') {
                enemy.x = rx
              }
            }
          }
        }

        // Collision check
        for (const enemy of s.enemies) {
          if (enemy.x === s.player.x && enemy.y === s.player.y) {
            s.gameOver = true
            analytics.easterEggGameOver(s.score)
            break
          }
        }

        // Win check — all dirt dug
        if (!s.gameOver) {
          let dirtRemaining = false
          for (let y = 0; y < ROWS && !dirtRemaining; y++) {
            for (let x = 0; x < COLS && !dirtRemaining; x++) {
              if (s.grid[y][x] === 'dirt') dirtRemaining = true
            }
          }
          if (!dirtRemaining) {
            s.won = true
            analytics.easterEggWin(s.score)
          }
        }
      }

      drawGame(ctx)
      rafRef.current = requestAnimationFrame(gameLoop)
    },
    [drawGame]
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Set canvas size
    canvas.width = WIDTH
    canvas.height = HEIGHT

    // Start game loop
    rafRef.current = requestAnimationFrame(gameLoop)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (stateRef.current.gameOver || stateRef.current.won) {
        resetGame()
        return
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key)) {
        e.preventDefault()
        keysRef.current.add(e.key)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    // Focus canvas for keyboard events
    canvas.tabIndex = 0
    canvas.focus()

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [gameLoop, resetGame])

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas
        ref={canvasRef}
        className="rounded-lg border border-border cursor-pointer w-full"
        style={{ imageRendering: 'pixelated', maxWidth: WIDTH }}
        onClick={() => {
          // Focus canvas for keyboard input
          canvasRef.current?.focus()
        }}
      />
    </div>
  )
}
