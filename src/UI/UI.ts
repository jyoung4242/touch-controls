export const model = {
  canvasElement: undefined as HTMLCanvasElement | undefined,
};

export const template = `
<div> 
    <style>
        #cnv{
            position: fixed;
            top:50%;
            left:50%;
            transform: translate(-50%, -50%);
        }
    </style>
    <canvas id='cnv' \${==> canvasElement}> </canvas> 
</div>`;
