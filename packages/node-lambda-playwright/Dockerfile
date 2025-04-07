FROM public.ecr.aws/lambda/nodejs:22

RUN dnf install -y \
    atk \
    cups-libs \
    gtk3 \
    libXcomposite \
    libXcursor \
    libXdamage \
    libXext \
    libXi \
    libXrandr \
    libXScrnSaver \
    libXtst \
    pango \
    xorg-x11-fonts-Type1 \
    xorg-x11-fonts-misc \
    nss \
    && dnf clean all

COPY . .

RUN npm i -g pnpm && pnpm i && pnpm run build

CMD [ "dist/src/index.handler" ]
