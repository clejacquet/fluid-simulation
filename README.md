# fluid-simulation
Fluid simulation training project using OpenGL

This project leverages SFML and OpenGL for the rendering and OpenGL compute shaders for the fluid solver computations.

The fluid solver has been implemented based on GPU Gems book from Nvidia. (http://developer.download.nvidia.com/books/HTML/gpugems/gpugems_ch38.html)

One important difference in this implementation from the above article is that neither Render To Target (RTT) nor Copy To Texture (CTT) is used. Instead Image Load/Store features are used, available since OpenGL 4.3.

A web version is also provided, using WebGL2 for both solver's computations and rendering of the fluid grid.
