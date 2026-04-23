FROM node:22-alpine AS frontend
WORKDIR /web
COPY web/package.json ./
RUN npm install
COPY web/ .
RUN npm run build

FROM golang:1.25-alpine AS backend
WORKDIR /src
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ .
COPY --from=frontend /web/dist internal/spa/dist/
RUN CGO_ENABLED=0 go build -o /server ./cmd/server

FROM alpine:3.21
RUN apk add --no-cache ca-certificates
COPY --from=backend /server /server
COPY data/app.db /data/app.db
COPY Game/Icons /icons
ENTRYPOINT ["/server", "-db", "/data/app.db", "-icons", "/icons"]
