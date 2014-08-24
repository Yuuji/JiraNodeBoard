JiraNodeBoard
=============

JiraNodeBoard

Install
=============

sudo apt-get update
sudo apt-get upgrade
sudo apt-get install cmake cmake-curses-gui gcc-4.7 g++-4.7
sudo rm /usr/bin/gcc
sudo ln -s /usr/bin/gcc-4.7 /usr/bin/gcc
sudo rm /usr/bin/g++
sudo ln -s /usr/bin/g++-4.7 /usr/bin/g++
cd ~
wget -O opencv.zip "http://downloads.sourceforge.net/project/opencvlibrary/opencv-unix/2.4.9/opencv-2.4.9.zip?r=http%3A%2F%2Fopencv.org%2Fdownloads.html&ts=1408810048&use_mirror=skylink"
unzip opencv.zip
cd opencv-2.4.9
mkdir build && cd build
ccmake .. (BUILD_PNG on)
make
sudo make install

cd ~
git clone https://github.com/chili-epfl/chilitags.git
cd chilitags
mkdir build && cd build
ccmake ..
make
sudo make install

cd ~
wget http://node-arm.herokuapp.com/node_latest_armhf.deb
sudo dpkg -i node_latest_armhf.deb
sudo npm -g install node-gyp

cd ~
git clone https://github.com/Yuuji/node-chilitags.git
cd node-chilitags
node-gyp configure build