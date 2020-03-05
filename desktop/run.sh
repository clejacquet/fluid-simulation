
#!/bin/bash


mkdir -p build
cd build && cmake ../ && make wtr && cd ../ && build/wtr