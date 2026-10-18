#!/usr/bin/env python3
"""
Terminal Snake Game in Python
Built with Python's standard curses library.
Zero external dependencies required.
"""

import curses
import time
import random
import os

HIGH_SCORE_FILE = os.path.expanduser("~/.snake_cli_highscore")

def load_high_score():
    if os.path.exists(HIGH_SCORE_FILE):
        try:
            with open(HIGH_SCORE_FILE, "r") as f:
                return int(f.read().strip())
        except Exception:
            return 0
    return 0

def save_high_score(score):
    try:
        with open(HIGH_SCORE_FILE, "w") as f:
            f.write(str(score))
    except Exception:
        pass

def main(stdscr):
    # Terminal setup
    curses.curs_set(0)
    stdscr.nodelay(True)
    curses.use_default_colors()

    # Color pairs setup
    has_colors = curses.has_colors()
    if has_colors:
        curses.start_color()
        curses.init_pair(1, curses.COLOR_GREEN, -1)   # Snake body
        curses.init_pair(2, curses.COLOR_CYAN, -1)    # Snake head
        curses.init_pair(3, curses.COLOR_RED, -1)     # Apple
        curses.init_pair(4, curses.COLOR_YELLOW, -1)  # Golden apple / High score
        curses.init_pair(5, curses.COLOR_MAGENTA, -1) # Title / Borders

    high_score = load_high_score()

    while True:
        # Game dimensions
        max_y, max_x = stdscr.getmaxyx()
        win_h, win_w = min(24, max_y - 2), min(60, max_x - 2)

        if win_h < 15 or win_w < 30:
            stdscr.clear()
            stdscr.addstr(0, 0, "Terminal window too small! Please enlarge your window.")
            stdscr.refresh()
            time.sleep(0.5)
            continue

        start_y = (max_y - win_h) // 2
        start_x = (max_x - win_w) // 2

        win = curses.newwin(win_h, win_w, start_y, start_x)
        win.keypad(True)
        win.nodelay(True)

        # Initial state
        snake = [
            [win_h // 2, win_w // 2],
            [win_h // 2, win_w // 2 - 1],
            [win_h // 2, win_w // 2 - 2]
        ]
        direction = curses.KEY_RIGHT
        score = 0
        speed = 100  # milliseconds per step

        def spawn_food(is_golden=False):
            while True:
                fy = random.randint(1, win_h - 2)
                fx = random.randint(1, win_w - 2)
                if [fy, fx] not in snake:
                    return [fy, fx]

        food = spawn_food()
        golden_food = None
        golden_timer = 0
        apples_eaten = 0
        paused = False

        # Start Screen Overlay
        win.clear()
        win.box()
        title = " S N A K E   C L I "
        prompt = "Press SPACE or ENTER to start (Q to quit)"
        win.addstr(win_h // 2 - 2, (win_w - len(title)) // 2, title, curses.color_pair(5) | curses.A_BOLD if has_colors else curses.A_BOLD)
        win.addstr(win_h // 2, (win_w - len(prompt)) // 2, prompt)
        win.refresh()

        started = False
        while not started:
            k = win.getch()
            if k in (ord('q'), ord('Q')):
                return
            if k in (ord(' '), 10, 13, curses.KEY_ENTER):
                started = True
            time.sleep(0.05)

        # Gameplay loop
        last_step = time.time()
        running = True
        game_over_reason = "CRASHED!"

        while running:
            win.timeout(speed)
            key = win.getch()

            if key in (ord('q'), ord('Q')):
                return

            if key == ord(' '):
                paused = not paused
                if paused:
                    pause_msg = " [ PAUSED - Press SPACE to resume ] "
                    win.addstr(win_h // 2, (win_w - len(pause_msg)) // 2, pause_msg, curses.A_REVERSE)
                    win.refresh()
                    while paused:
                        pk = win.getch()
                        if pk in (ord('q'), ord('Q')):
                            return
                        if pk == ord(' '):
                            paused = False
                            break
                        time.sleep(0.05)
                continue

            # Speed adjustment (+/- or [/])
            if key in (ord('+'), ord('='), ord(']')):
                speed = max(25, speed - 10)
            elif key in (ord('-'), ord('_'), ord('[')):
                speed = min(200, speed + 10)

            # Direction input with 180° turn prevention
            if key in (curses.KEY_UP, ord('w'), ord('W')) and direction != curses.KEY_DOWN:
                direction = curses.KEY_UP
            elif key in (curses.KEY_DOWN, ord('s'), ord('S')) and direction != curses.KEY_UP:
                direction = curses.KEY_DOWN
            elif key in (curses.KEY_LEFT, ord('a'), ord('A')) and direction != curses.KEY_RIGHT:
                direction = curses.KEY_LEFT
            elif key in (curses.KEY_RIGHT, ord('d'), ord('D')) and direction != curses.KEY_LEFT:
                direction = curses.KEY_RIGHT

            # Calculate new head position
            head_y, head_x = snake[0]
            if direction == curses.KEY_UP:
                head_y -= 1
            elif direction == curses.KEY_DOWN:
                head_y += 1
            elif direction == curses.KEY_LEFT:
                head_x -= 1
            elif direction == curses.KEY_RIGHT:
                head_x += 1

            new_head = [head_y, head_x]

            # Wall collision
            if head_y <= 0 or head_y >= win_h - 1 or head_x <= 0 or head_x >= win_w - 1:
                game_over_reason = "HIT THE WALL!"
                running = False
                break

            # Self collision
            if new_head in snake[:-1]:
                game_over_reason = "BIT YOURSELF!"
                running = False
                break

            snake.insert(0, new_head)

            # Food check
            if new_head == food:
                score += 10
                apples_eaten += 1
                food = spawn_food()
                if apples_eaten % 5 == 0 and not golden_food:
                    golden_food = spawn_food()
                    golden_timer = time.time() + 8.0  # 8 seconds
                speed = max(40, speed - 1)
            elif golden_food and new_head == golden_food:
                score += 50
                golden_food = None
            else:
                snake.pop()

            # Golden food expiry check
            if golden_food and time.time() > golden_timer:
                golden_food = None

            # Render
            win.clear()
            win.box()

            # Header info
            spd_mult = round(100.0 / speed, 1)
            score_str = f" SCORE: {score}  |  BEST: {max(score, high_score)}  |  SPD: {spd_mult}x "
            win.addstr(0, max(2, (win_w - len(score_str)) // 2), score_str, curses.color_pair(4) | curses.A_BOLD if has_colors else curses.A_BOLD)

            # Draw Golden Food
            if golden_food:
                rem = max(0, int(golden_timer - time.time()))
                win.addch(golden_food[0], golden_food[1], '*', curses.color_pair(4) | curses.A_BOLD if has_colors else curses.A_BOLD)

            # Draw Apple
            win.addch(food[0], food[1], 'o', curses.color_pair(3) | curses.A_BOLD if has_colors else curses.A_BOLD)

            # Draw Snake
            for idx, (sy, sx) in enumerate(snake):
                if idx == 0:
                    char = '@'
                    color = curses.color_pair(2) | curses.A_BOLD if has_colors else curses.A_BOLD
                else:
                    char = '#'
                    color = curses.color_pair(1) if has_colors else curses.A_NORMAL
                win.addch(sy, sx, char, color)

            win.refresh()

        # Update high score
        if score > high_score:
            high_score = score
            save_high_score(high_score)

        # Game Over Screen
        win.box()
        go_title = f" GAME OVER - {game_over_reason} "
        stats = f" Final Score: {score}  |  Apples: {apples_eaten} "
        retry = " Press SPACE to Play Again  (Q to quit) "

        win.addstr(win_h // 2 - 2, max(1, (win_w - len(go_title)) // 2), go_title, curses.color_pair(3) | curses.A_BOLD if has_colors else curses.A_BOLD)
        win.addstr(win_h // 2, max(1, (win_w - len(stats)) // 2), stats, curses.A_BOLD)
        win.addstr(win_h // 2 + 2, max(1, (win_w - len(retry)) // 2), retry)
        win.refresh()

        # Wait for restart or quit
        while True:
            k = win.getch()
            if k in (ord('q'), ord('Q')):
                return
            if k in (ord(' '), 10, 13, curses.KEY_ENTER):
                break
            time.sleep(0.05)

if __name__ == "__main__":
    try:
        curses.wrapper(main)
    except KeyboardInterrupt:
        pass
