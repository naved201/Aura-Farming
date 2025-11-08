import React from 'react';

const imgIcon = "https://www.figma.com/api/mcp/asset/0e67f2a2-fe31-4f83-99a8-449338d55528";

export function Menu({ className }) {
  return (
    <div className={className} data-name="menu" data-node-id="1:22">
      <div className="absolute bottom-1/4 left-[12.5%] right-[12.5%] top-1/4" data-name="icon" data-node-id="1:23">
        <div className="absolute inset-0" style={{ "--fill-0": "rgba(29, 27, 32, 1)" }}>
          <img alt="" className="block max-w-none w-full h-full" src={imgIcon} />
        </div>
      </div>
    </div>
  );
}

