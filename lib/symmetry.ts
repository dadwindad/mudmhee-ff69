import { SymmetryGroup } from './types';

export function applySymmetry(
  ctx: CanvasRenderingContext2D,
  group: SymmetryGroup,
  motifWidth: number,
  motifHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  offsetX: number,
  offsetY: number,
  drawFn: () => void
) {
  ctx.save();
  ctx.translate(offsetX, offsetY);

  // Calculate how many repetitions we need to cover the canvas, accounting for offsets
  const startCol = Math.floor(-offsetX / motifWidth) - 4;
  const endCol = Math.ceil((canvasWidth - offsetX) / motifWidth) + 4;
  const startRow = Math.floor(-offsetY / motifHeight) - 4;
  const endRow = Math.ceil((canvasHeight - offsetY) / motifHeight) + 4;

  const isFrieze = ['p111', 'p112', 'pm11', 'p1m1', 'p11g', 'pmm2', 'pmg2'].includes(group);

  if (isFrieze) {
    for (let i = startCol; i <= endCol; i++) {
      for (let j = startRow; j <= endRow; j++) {
        const tx = i * motifWidth;
        const ty = j * motifHeight;

        ctx.save();
        
        if (group === 'p111') {
          ctx.translate(tx, ty);
          drawFn();
        } 
        else if (group === 'p112') {
          if (i % 2 === 0) {
            ctx.translate(tx, ty);
            drawFn();
          } else {
            ctx.translate(tx + motifWidth, ty + motifHeight);
            ctx.scale(-1, -1);
            drawFn();
          }
        }
        else if (group === 'pm11') {
          if (i % 2 === 0) {
            ctx.translate(tx, ty);
            drawFn();
          } else {
            ctx.translate(tx + motifWidth, ty);
            ctx.scale(-1, 1);
            drawFn();
          }
        }
        else if (group === 'p1m1') {
          if (j % 2 === 0) {
            ctx.translate(tx, ty);
            drawFn();
          } else {
            ctx.translate(tx, ty + motifHeight);
            ctx.scale(1, -1);
            drawFn();
          }
        }
        else if (group === 'p11g') {
          if (j % 2 === 0) {
            ctx.translate(tx, ty);
            drawFn();
          } else {
            ctx.translate(tx + motifWidth, ty + motifHeight);
            ctx.scale(1, -1);
            drawFn();
          }
        }
        else if (group === 'pmm2') {
          const flipX = i % 2 !== 0;
          const flipY = j % 2 !== 0;
          ctx.translate(tx + (flipX ? motifWidth : 0), ty + (flipY ? motifHeight : 0));
          ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
          drawFn();
        }
        else if (group === 'pmg2') {
          const flipX = i % 2 !== 0;
          const flipY = j % 2 !== 0;
          if (!flipY) {
            ctx.translate(tx + (flipX ? motifWidth : 0), ty);
            ctx.scale(flipX ? -1 : 1, 1);
          } else {
            ctx.translate(tx + motifWidth + (flipX ? -motifWidth : 0), ty + motifHeight);
            ctx.scale(flipX ? 1 : -1, -1);
          }
          drawFn();
        }

        ctx.restore();
      }
    }
  } 
  // Wallpaper Groups (Body)
  else {
    for (let i = startCol; i <= endCol; i++) {
      for (let j = startRow; j <= endRow; j++) {
        
        if (group === 'p3' || group === 'p3m1' || group === 'p31m') {
          const h = motifWidth * Math.sqrt(3) / 2;
          const tx = i * motifWidth + j * (motifWidth / 2);
          const ty = j * h;

          const angle = (Math.PI * 2) / 3;

          for (let r = 0; r < 3; r++) {
            ctx.save();
            ctx.translate(tx, ty);
            ctx.rotate(r * angle);
            drawFn();
            ctx.restore();

            if (group === 'p3m1') {
              ctx.save();
              ctx.translate(tx, ty);
              ctx.rotate(r * angle);
              ctx.scale(-1, 1);
              drawFn();
              ctx.restore();
            }
            else if (group === 'p31m') {
              ctx.save();
              ctx.translate(tx, ty);
              ctx.rotate(r * angle);
              ctx.scale(1, -1);
              drawFn();
              ctx.restore();
            }
          }
        }
      }
    }
  }

  ctx.restore();
}

export function drawSymmetryAxes(
  ctx: CanvasRenderingContext2D,
  group: SymmetryGroup,
  motifWidth: number,
  motifHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  offsetX: number,
  offsetY: number
) {
  applySymmetry(
    ctx,
    group,
    motifWidth,
    motifHeight,
    canvasWidth,
    canvasHeight,
    offsetX,
    offsetY,
    () => {
      const isHex = group === 'p3' || group === 'p3m1' || group === 'p31m';

      // Draw motif boundary (Translation unit)
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)'; // Green for motif boundary
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      
      if (isHex) {
        const h = motifWidth * Math.sqrt(3) / 2;
        ctx.moveTo(0, 0);
        ctx.lineTo(motifWidth, 0);
        ctx.lineTo(motifWidth / 2, h);
        ctx.closePath();
      } else {
        ctx.rect(0, 0, motifWidth, motifHeight);
      }
      ctx.stroke();

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)'; // Red for reflection
      ctx.lineWidth = 2;
      ctx.setLineDash([]);

      const extX = motifWidth * 2;
      const extY = motifHeight * 2;

      if (group === 'pm11' || group === 'pmm2' || group === 'pmg2') {
        ctx.moveTo(0, -extY);
        ctx.lineTo(0, extY);
        ctx.moveTo(motifWidth, -extY);
        ctx.lineTo(motifWidth, extY);
      }
      if (group === 'p1m1' || group === 'pmm2') {
        ctx.moveTo(-extX, 0);
        ctx.lineTo(extX, 0);
        ctx.moveTo(-extX, motifHeight);
        ctx.lineTo(extX, motifHeight);
      }
      ctx.stroke();

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)'; // Blue dashed for glide reflection
      ctx.setLineDash([5, 5]);
      if (group === 'p11g' || group === 'pmg2') {
        ctx.moveTo(-extX, motifHeight / 2);
        ctx.lineTo(extX, motifHeight / 2);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      if (group === 'p3m1') {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
        ctx.moveTo(0, -extY);
        ctx.lineTo(0, extY);
        ctx.stroke();
      }
      if (group === 'p31m') {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
        ctx.moveTo(-extX, 0);
        ctx.lineTo(extX, 0);
        ctx.stroke();
      }
    }
  );
}

export function drawMotifAxes(
  ctx: CanvasRenderingContext2D,
  group: SymmetryGroup,
  width: number,
  height: number
) {
  ctx.save();
  
  const isHex = group === 'p3' || group === 'p3m1' || group === 'p31m';

  // Draw motif boundary (Translation unit)
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(34, 197, 94, 0.8)'; // Green for motif boundary
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  
  if (isHex) {
    const h = width * Math.sqrt(3) / 2;
    ctx.moveTo(0, 0);
    ctx.lineTo(width, 0);
    ctx.lineTo(width / 2, h);
    ctx.closePath();
  } else {
    ctx.rect(1, 1, width - 2, height - 2);
  }
  ctx.stroke();

  ctx.beginPath();
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
  ctx.lineWidth = 2;
  ctx.setLineDash([]);

  if (group === 'pm11' || group === 'pmm2' || group === 'pmg2') {
    ctx.moveTo(0, 0);
    ctx.lineTo(0, height);
    ctx.moveTo(width, 0);
    ctx.lineTo(width, height);
  }
  if (group === 'p1m1' || group === 'pmm2') {
    ctx.moveTo(0, 0);
    ctx.lineTo(width, 0);
    ctx.moveTo(0, height);
    ctx.lineTo(width, height);
  }
  ctx.stroke();

  ctx.beginPath();
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
  ctx.setLineDash([5, 5]);
  if (group === 'p11g' || group === 'pmg2') {
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  if (group === 'p3m1') {
    const angle = (Math.PI * 2) / 3;
    for (let r = 0; r < 3; r++) {
      ctx.save();
      ctx.translate(0, 0);
      ctx.rotate(r * angle);
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
      ctx.moveTo(0, -height * 2);
      ctx.lineTo(0, height * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
  
  if (group === 'p31m') {
    const angle = (Math.PI * 2) / 3;
    for (let r = 0; r < 3; r++) {
      ctx.save();
      ctx.translate(0, 0);
      ctx.rotate(r * angle);
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
      ctx.moveTo(-width * 2, 0);
      ctx.lineTo(width * 2, 0);
      ctx.stroke();
      ctx.restore();
    }
  }

  ctx.restore();
}

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  gridSize: number,
  canvasWidth: number,
  canvasHeight: number,
  offsetX: number = 0,
  offsetY: number = 0,
  group?: SymmetryGroup
) {
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.lineWidth = 1;

  const isHex = group === 'p3' || group === 'p3m1' || group === 'p31m';

  if (isHex) {
    const h = gridSize * Math.sqrt(3) / 2;
    const diagLen = Math.sqrt(canvasWidth * canvasWidth + canvasHeight * canvasHeight) * 2;
    
    const startY = offsetY % h;
    for (let y = startY - h * Math.ceil(canvasHeight/h); y <= canvasHeight + h; y += h) {
      ctx.beginPath();
      ctx.moveTo(-canvasWidth, y);
      ctx.lineTo(canvasWidth * 2, y);
      ctx.stroke();
    }

    const startX = offsetX % gridSize;
    for (let x = startX - canvasWidth * 2; x <= canvasWidth * 2; x += gridSize) {
      ctx.save();
      ctx.translate(x, offsetY);
      
      ctx.rotate(Math.PI / 3);
      ctx.beginPath();
      ctx.moveTo(-diagLen, 0);
      ctx.lineTo(diagLen, 0);
      ctx.stroke();
      
      ctx.rotate(Math.PI / 3);
      ctx.beginPath();
      ctx.moveTo(-diagLen, 0);
      ctx.lineTo(diagLen, 0);
      ctx.stroke();
      
      ctx.restore();
    }
  } else {
    const startX = offsetX % gridSize;
    const startY = offsetY % gridSize;

    for (let x = startX - gridSize; x <= canvasWidth; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasHeight);
      ctx.stroke();
    }

    for (let y = startY - gridSize; y <= canvasHeight; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth, y);
      ctx.stroke();
    }
  }

  ctx.restore();
}

