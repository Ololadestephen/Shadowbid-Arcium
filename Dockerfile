FROM rust:1.79-slim

# Install Solana tools
RUN sh -c "$(curl -sSfL https://release.solana.com/v1.17.0/install)" && \
    export PATH="/root/.local/share/solana/install/active_release/bin:$PATH"

# Install Arcium CLI
RUN cargo install arcium-cli

WORKDIR /workspace
COPY . .

# Build
CMD ["arcium", "build"]
