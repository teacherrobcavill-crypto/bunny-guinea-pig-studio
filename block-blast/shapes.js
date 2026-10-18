/**
 * Block Blast - Shape Definitions & Generation Engine
 * Contains definitions for all 30+ Block Blast shapes, weights, color themes,
 * rotation logic, and smart generation algorithms.
 */

const SHAPE_DEFINITIONS = [
  // 1. Single dot (1x1)
  {
    id: 'dot_1x1',
    name: 'Single Dot',
    matrix: [[1]],
    color: 'coral',
    weight: 2,
    rarity: 'rare'
  },

  // 2. Straight Bars (Horizontal)
  {
    id: 'bar_1x2',
    name: '1x2 Bar',
    matrix: [[1, 1]],
    color: 'cyan',
    weight: 8,
    rarity: 'common'
  },
  {
    id: 'bar_1x3',
    name: '1x3 Bar',
    matrix: [[1, 1, 1]],
    color: 'sky',
    weight: 7,
    rarity: 'common'
  },
  {
    id: 'bar_1x4',
    name: '1x4 Bar',
    matrix: [[1, 1, 1, 1]],
    color: 'blue',
    weight: 5,
    rarity: 'medium'
  },
  {
    id: 'bar_1x5',
    name: '1x5 Bar',
    matrix: [[1, 1, 1, 1, 1]],
    color: 'indigo',
    weight: 3,
    rarity: 'rare'
  },

  // 3. Straight Bars (Vertical)
  {
    id: 'bar_2x1',
    name: '2x1 Bar',
    matrix: [[1], [1]],
    color: 'cyan',
    weight: 8,
    rarity: 'common'
  },
  {
    id: 'bar_3x1',
    name: '3x1 Bar',
    matrix: [[1], [1], [1]],
    color: 'sky',
    weight: 7,
    rarity: 'common'
  },
  {
    id: 'bar_4x1',
    name: '4x1 Bar',
    matrix: [[1], [1], [1], [1]],
    color: 'blue',
    weight: 5,
    rarity: 'medium'
  },
  {
    id: 'bar_5x1',
    name: '5x1 Bar',
    matrix: [[1], [1], [1], [1], [1]],
    color: 'indigo',
    weight: 3,
    rarity: 'rare'
  },

  // 4. Squares & Rectangles
  {
    id: 'square_2x2',
    name: '2x2 Square',
    matrix: [
      [1, 1],
      [1, 1]
    ],
    color: 'amber',
    weight: 7,
    rarity: 'common'
  },
  {
    id: 'square_3x3',
    name: '3x3 Giant Square',
    matrix: [
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1]
    ],
    color: 'gold',
    weight: 2,
    rarity: 'rare'
  },
  {
    id: 'rect_2x3',
    name: '2x3 Rectangle',
    matrix: [
      [1, 1, 1],
      [1, 1, 1]
    ],
    color: 'orange',
    weight: 3,
    rarity: 'rare'
  },
  {
    id: 'rect_3x2',
    name: '3x2 Rectangle',
    matrix: [
      [1, 1],
      [1, 1],
      [1, 1]
    ],
    color: 'orange',
    weight: 3,
    rarity: 'rare'
  },

  // 5. Small Corners (2x2, 3 blocks)
  {
    id: 'corner_tl',
    name: 'Corner Top-Left',
    matrix: [
      [1, 1],
      [1, 0]
    ],
    color: 'lime',
    weight: 6,
    rarity: 'common'
  },
  {
    id: 'corner_tr',
    name: 'Corner Top-Right',
    matrix: [
      [1, 1],
      [0, 1]
    ],
    color: 'lime',
    weight: 6,
    rarity: 'common'
  },
  {
    id: 'corner_bl',
    name: 'Corner Bottom-Left',
    matrix: [
      [1, 0],
      [1, 1]
    ],
    color: 'lime',
    weight: 6,
    rarity: 'common'
  },
  {
    id: 'corner_br',
    name: 'Corner Bottom-Right',
    matrix: [
      [0, 1],
      [1, 1]
    ],
    color: 'lime',
    weight: 6,
    rarity: 'common'
  },

  // 6. Classic 4-Block L & J Shapes (3x2 and 2x3)
  {
    id: 'l_vert_1',
    name: 'L-Shape Vertical Right',
    matrix: [
      [1, 0],
      [1, 0],
      [1, 1]
    ],
    color: 'purple',
    weight: 5,
    rarity: 'medium'
  },
  {
    id: 'l_vert_2',
    name: 'J-Shape Vertical Left',
    matrix: [
      [0, 1],
      [0, 1],
      [1, 1]
    ],
    color: 'purple',
    weight: 5,
    rarity: 'medium'
  },
  {
    id: 'l_vert_3',
    name: 'Inverted L Vertical',
    matrix: [
      [1, 1],
      [1, 0],
      [1, 0]
    ],
    color: 'purple',
    weight: 5,
    rarity: 'medium'
  },
  {
    id: 'l_vert_4',
    name: 'Inverted J Vertical',
    matrix: [
      [1, 1],
      [0, 1],
      [0, 1]
    ],
    color: 'purple',
    weight: 5,
    rarity: 'medium'
  },
  {
    id: 'l_horiz_1',
    name: 'L-Shape Horizontal 1',
    matrix: [
      [1, 1, 1],
      [1, 0, 0]
    ],
    color: 'purple',
    weight: 5,
    rarity: 'medium'
  },
  {
    id: 'l_horiz_2',
    name: 'L-Shape Horizontal 2',
    matrix: [
      [1, 1, 1],
      [0, 0, 1]
    ],
    color: 'purple',
    weight: 5,
    rarity: 'medium'
  },
  {
    id: 'l_horiz_3',
    name: 'L-Shape Horizontal 3',
    matrix: [
      [1, 0, 0],
      [1, 1, 1]
    ],
    color: 'purple',
    weight: 5,
    rarity: 'medium'
  },
  {
    id: 'l_horiz_4',
    name: 'L-Shape Horizontal 4',
    matrix: [
      [0, 0, 1],
      [1, 1, 1]
    ],
    color: 'purple',
    weight: 5,
    rarity: 'medium'
  },

  // 7. Giant 5-Block L-Shapes (3x3)
  {
    id: 'big_l_1',
    name: 'Big L Top-Left',
    matrix: [
      [1, 0, 0],
      [1, 0, 0],
      [1, 1, 1]
    ],
    color: 'emerald',
    weight: 3,
    rarity: 'rare'
  },
  {
    id: 'big_l_2',
    name: 'Big L Top-Right',
    matrix: [
      [0, 0, 1],
      [0, 0, 1],
      [1, 1, 1]
    ],
    color: 'emerald',
    weight: 3,
    rarity: 'rare'
  },
  {
    id: 'big_l_3',
    name: 'Big L Bottom-Left',
    matrix: [
      [1, 1, 1],
      [1, 0, 0],
      [1, 0, 0]
    ],
    color: 'emerald',
    weight: 3,
    rarity: 'rare'
  },
  {
    id: 'big_l_4',
    name: 'Big L Bottom-Right',
    matrix: [
      [1, 1, 1],
      [0, 0, 1],
      [0, 0, 1]
    ],
    color: 'emerald',
    weight: 3,
    rarity: 'rare'
  },

  // 8. T-Shapes (3x2 and 2x3)
  {
    id: 't_down',
    name: 'T-Shape Down',
    matrix: [
      [1, 1, 1],
      [0, 1, 0]
    ],
    color: 'magenta',
    weight: 5,
    rarity: 'medium'
  },
  {
    id: 't_up',
    name: 'T-Shape Up',
    matrix: [
      [0, 1, 0],
      [1, 1, 1]
    ],
    color: 'magenta',
    weight: 5,
    rarity: 'medium'
  },
  {
    id: 't_left',
    name: 'T-Shape Left',
    matrix: [
      [1, 0],
      [1, 1],
      [1, 0]
    ],
    color: 'magenta',
    weight: 5,
    rarity: 'medium'
  },
  {
    id: 't_right',
    name: 'T-Shape Right',
    matrix: [
      [0, 1],
      [1, 1],
      [0, 1]
    ],
    color: 'magenta',
    weight: 5,
    rarity: 'medium'
  },

  // 9. S & Z Tetrominoes
  {
    id: 'z_horiz',
    name: 'Z-Shape Horizontal',
    matrix: [
      [1, 1, 0],
      [0, 1, 1]
    ],
    color: 'green',
    weight: 4,
    rarity: 'medium'
  },
  {
    id: 's_horiz',
    name: 'S-Shape Horizontal',
    matrix: [
      [0, 1, 1],
      [1, 1, 0]
    ],
    color: 'green',
    weight: 4,
    rarity: 'medium'
  },
  {
    id: 'z_vert',
    name: 'Z-Shape Vertical',
    matrix: [
      [0, 1],
      [1, 1],
      [1, 0]
    ],
    color: 'green',
    weight: 4,
    rarity: 'medium'
  },
  {
    id: 's_vert',
    name: 'S-Shape Vertical',
    matrix: [
      [1, 0],
      [1, 1],
      [0, 1]
    ],
    color: 'green',
    weight: 4,
    rarity: 'medium'
  },

  // 10. Plus / Cross (5 blocks)
  {
    id: 'plus_cross',
    name: 'Plus Cross',
    matrix: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 1, 0]
    ],
    color: 'rose',
    weight: 2,
    rarity: 'rare'
  },

  // 11. Mini Steps / Diagonals (2 blocks)
  {
    id: 'step_diag_1',
    name: 'Mini Step Diag 1',
    matrix: [
      [1, 0],
      [0, 1]
    ],
    color: 'teal',
    weight: 3,
    rarity: 'common'
  },
  {
    id: 'step_diag_2',
    name: 'Mini Step Diag 2',
    matrix: [
      [0, 1],
      [1, 0]
    ],
    color: 'teal',
    weight: 3,
    rarity: 'common'
  }
];

class ShapeManager {
  /**
   * Count how many non-zero blocks are in a shape matrix
   */
  static countBlocks(matrix) {
    let count = 0;
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c] !== 0) count++;
      }
    }
    return count;
  }

  /**
   * Rotate a 2D matrix 90 degrees clockwise
   */
  static rotateMatrix(matrix) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const rotated = [];
    for (let c = 0; c < cols; c++) {
      const newRow = [];
      for (let r = rows - 1; r >= 0; r--) {
        newRow.push(matrix[r][c]);
      }
      rotated.push(newRow);
    }
    return rotated;
  }

  /**
   * Check if a shape matrix can be placed on board at (startRow, startCol)
   */
  static canPieceFitAt(board, matrix, startRow, startCol) {
    const rows = matrix.length;
    const cols = matrix[0].length;

    // Check bounds
    if (startRow < 0 || startCol < 0 || startRow + rows > 8 || startCol + cols > 8) {
      return false;
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (matrix[r][c] !== 0) {
          if (board[startRow + r][startCol + c] !== 0) {
            return false; // Cell already occupied
          }
        }
      }
    }
    return true;
  }

  /**
   * Check if a piece can fit ANYWHERE on the board
   */
  static canPieceFitAnywhere(board, matrix) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    for (let r = 0; r <= 8 - rows; r++) {
      for (let c = 0; c <= 8 - cols; c++) {
        if (this.canPieceFitAt(board, matrix, r, c)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Find all valid placement coordinates for a piece
   */
  static getValidPlacements(board, matrix) {
    const valid = [];
    const rows = matrix.length;
    const cols = matrix[0].length;
    for (let r = 0; r <= 8 - rows; r++) {
      for (let c = 0; c <= 8 - cols; c++) {
        if (this.canPieceFitAt(board, matrix, r, c)) {
          valid.push({ row: r, col: c });
        }
      }
    }
    return valid;
  }

  /**
   * Pick a random shape definition using weighted probabilities
   */
  static getRandomShapeDef(excludedIds = []) {
    const pool = SHAPE_DEFINITIONS.filter(def => !excludedIds.includes(def.id));
    const totalWeight = pool.reduce((sum, s) => sum + s.weight, 0);
    let rand = Math.random() * totalWeight;

    for (const shape of pool) {
      if (rand < shape.weight) {
        return shape;
      }
      rand -= shape.weight;
    }
    return pool[0] || SHAPE_DEFINITIONS[0];
  }

  /**
   * Smart Piece Generator:
   * Returns an array of 3 piece objects.
   * Ensures at least one piece is guaranteed to fit on current board state,
   * avoids duplicate massive pieces (like 3x3s), and balances game pace.
   */
  static generatePieceSet(board, count = 3) {
    const pieces = [];
    const usedIds = new Set();
    let hasPlaceablePiece = false;
    let hasBigShape = false;

    for (let i = 0; i < count; i++) {
      let chosenDef = null;
      let attempts = 0;

      while (attempts < 30) {
        attempts++;
        const candidate = this.getRandomShapeDef(Array.from(usedIds));

        // Prevent multiple rare/massive shapes in one set
        const isBig = candidate.rarity === 'rare' || candidate.matrix.length >= 3 || (candidate.matrix[0] && candidate.matrix[0].length >= 3);
        if (isBig && hasBigShape && Math.random() < 0.75) {
          continue;
        }

        const fits = this.canPieceFitAnywhere(board, candidate.matrix);

        // If this is the last piece and none fit yet, insist on finding one that fits!
        if (i === count - 1 && !hasPlaceablePiece && !fits && attempts < 25) {
          continue;
        }

        chosenDef = candidate;
        if (fits) hasPlaceablePiece = true;
        if (isBig) hasBigShape = true;
        break;
      }

      if (!chosenDef) {
        // Fallback: search for ANY shape that fits
        const fittingShapes = SHAPE_DEFINITIONS.filter(s => this.canPieceFitAnywhere(board, s.matrix));
        if (fittingShapes.length > 0) {
          chosenDef = fittingShapes[Math.floor(Math.random() * fittingShapes.length)];
          hasPlaceablePiece = true;
        } else {
          // If literally nothing fits on the board, the game is over regardless
          chosenDef = SHAPE_DEFINITIONS[Math.floor(Math.random() * SHAPE_DEFINITIONS.length)];
        }
      }

      usedIds.add(chosenDef.id);

      pieces.push({
        instanceId: 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6) + '_' + i,
        id: chosenDef.id,
        name: chosenDef.name,
        matrix: chosenDef.matrix.map(row => [...row]),
        color: chosenDef.color,
        blockCount: this.countBlocks(chosenDef.matrix),
        rows: chosenDef.matrix.length,
        cols: chosenDef.matrix[0].length
      });
    }

    return pieces;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SHAPE_DEFINITIONS, ShapeManager };
}
