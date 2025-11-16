# Set CMAKE_ROOT if not set (for dlib compilation)
if [ -z "$CMAKE_ROOT" ] && [ -d "/layers/digitalocean_apt/apt/usr/share/cmake" ]; then
  export CMAKE_ROOT="/layers/digitalocean_apt/apt/usr/share/cmake"
fi

# Ensure CMake can find its modules
if [ -d "/layers/digitalocean_apt/apt/usr/share/cmake-3.22" ]; then
  export CMAKE_ROOT="/layers/digitalocean_apt/apt/usr/share/cmake-3.22"
fi

# Add apt-installed libraries to paths
export LD_LIBRARY_PATH="/layers/digitalocean_apt/apt/lib/x86_64-linux-gnu:/layers/digitalocean_apt/apt/lib/i386-linux-gnu:/layers/digitalocean_apt/apt/lib:/layers/digitalocean_apt/apt/usr/lib/x86_64-linux-gnu:/layers/digitalocean_apt/apt/usr/lib/i386-linux-gnu:/layers/digitalocean_apt/apt/usr/lib:$LD_LIBRARY_PATH"

export PKG_CONFIG_PATH="/layers/digitalocean_apt/apt/usr/lib/x86_64-linux-gnu/pkgconfig:/layers/digitalocean_apt/apt/usr/lib/i386-linux-gnu/pkgconfig:/layers/digitalocean_apt/apt/usr/lib/pkgconfig:$PKG_CONFIG_PATH"

