# doesn't work.
let moz_overlay = import (builtins.fetchTarball "https://github.com/mozilla/nixpkgs-mozilla/archive/9b11a87c0cc54e308fa83aac5b4ee1816d5418a2.tar.gz");
in

{ pkgs ? import <nixpkgs> { overlays = [ moz_overlay ]; } }: pkgs.mkShell {
  packages = [ pkgs.latest.firefox-nightly-bin ];
}
