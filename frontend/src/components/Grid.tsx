import { GRID_SIZE, type MatchState } from '../types.ts';
import type { ReactElement } from 'react';

function edgeKey(ax: number, ay: number, bx: number, by: number): string {
  const [p1, p2] =
    ay < by || (ay === by && ax < bx) ? [[ax, ay], [bx, by]] : [[bx, by], [ax, ay]];
  return `${p1[0]},${p1[1]}-${p2[0]},${p2[1]}`;
}

function hasWall(
  wallEdges: string[],
  x: number,
  y: number,
  nx: number,
  ny: number,
): boolean {
  if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) return false;
  return wallEdges.includes(edgeKey(x, y, nx, ny));
}

export function Grid({ match }: { match: MatchState }) {
  const cells: ReactElement[] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const isSeeker =
        match.players.seeker?.position.x === x &&
        match.players.seeker?.position.y === y;
      const isHider =
        match.players.hider?.position.x === x &&
        match.players.hider?.position.y === y;

      const wallClasses = [
        hasWall(match.wallEdges, x, y, x, y - 1) ? 'wall-top' : '',
        hasWall(match.wallEdges, x, y, x + 1, y) ? 'wall-right' : '',
        hasWall(match.wallEdges, x, y, x, y + 1) ? 'wall-bottom' : '',
        hasWall(match.wallEdges, x, y, x - 1, y) ? 'wall-left' : '',
      ]
        .filter(Boolean)
        .join(' ');

      cells.push(
        <div key={`${x}-${y}`} className={`cell ${wallClasses}`}>
          {isSeeker ? 'S' : isHider ? 'H' : ''}
        </div>,
      );
    }
  }

  return <div className="grid">{cells}</div>;
}
