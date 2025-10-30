# Introduction

## Install Headless Chrome

```bash
sudo apt install -y npm
sudo npx -y @puppeteer/browsers install chrome-headless-shell@stable --install-deps --path /opt
sudo ln -s $(ls /opt/chrome-headless-shell/linux-*/chrome-headless-shell-linux64/chrome-headless-shell) /bin/chrome-headless-shell
sudo apt remove -y npm
sudo apt autoremove -y
# sudo apt install -y libglib2.0-dev libnspr4-dev libnss3-dev libnss3-dev libdbus-1-dev libatk1.0-dev libatk-bridge2.0-dev libxcomposite-dev libxdamage-dev libxrandr-dev libgbm-dev libxkbcommon-dev libasound2-dev
```
