---
layout: default
title: "mako-sgp4"
date: 2026-10-06
description: A theory-based SGP4 satellite propagator written in Rust
image: /assets/images/mako/logo.png
featured: 1
demo: /projects/mako-sgp4/demo/
---
# Meet mako-sgp4
---
<div style="text-align: center;">
    <img src="{{ 'assets/images/mako/logo.png' | relative_url }}" alt="mako-sgp4 logo" style="width:50%; border-radius:10px;">
</div>

mako-sgp4 is a Rust crate that parses General Perturbation (GP) element sets and propagates them with the SGP4/SDP4 algorithm. Given any TLE or OMM from Space-Track or CelesTrak, SGP4 can propagate the satellite's state to a position and velocity at a desired time. The motivations for this project were twofold: 
1. To learn Rust
2. To understand SGP4 from the theory side

The crate is open source on [GitHub](https://github.com/markparal/mako-sgp4) and published on [crates.io](https://crates.io/crates/mako-sgp4), with API documentation on [docs.rs](https://docs.rs/mako-sgp4). The name pays homage to the shortfin mako, the fastest shark species in the ocean.

# Try it yourself!
---
mako-sgp4 compiles to WebAssembly, so it can run directly in your browser. The interactive demo propagates up to 8 TLEs or OMMs and shows each orbit on a 3D globe in the inertial (TEME) frame, alongside its ground track.

<p><a href="{{ '/projects/mako-sgp4/demo/' | relative_url }}" class="demo-run demo-link">Open the demo →</a></p>

# Built from the Theory
---
To better understand the theory basis of SGP4, I avoided directly porting the popular Vallado implementation. Instead, I relied on the theory in *History of Analytical Orbit Modeling in the U.S. Space Surveillance System* by Hoots et al. Practical adjustments to the code were made by referencing *Revisiting Spacetrack Report #3* by Vallado et al.

The theory and equations used in mako-sgp4 are written up in a [math specification](https://github.com/markparal/mako-sgp4/blob/main/docs/mathspec.md). This document is meant as a companion to help users better understand the code they are using. For that reason, many references to the source code are included.

# Formats
---
mako-sgp4 accepts both Two-Line Element sets (TLEs) and Orbit Mean-Elements Messages (OMMs). TLE and OMM KVN parsing have no third-party dependencies. OMM XML, JSON, and CSV are optional features, so users only pull in what they need. Additionally, mako-sgp4 supports the new alpha-5 TLE convention.

### Example TLE
```
ISS (ZARYA)
1 25544U 98067A   08264.51782528 -.00002182 -00100-2 -11606-4 0  2921
2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537
```

### Example OMM
```
CCSDS_OMM_VERS = 2.0
CREATION_DATE  = 
ORIGINATOR     = 

OBJECT_NAME    = ISS (ZARYA)
OBJECT_ID      = 1998-067A
CENTER_NAME    = EARTH
REF_FRAME      = TEME
TIME_SYSTEM    = UTC
MEAN_ELEMENT_THEORY = SGP/SGP4

EPOCH          = 2008-09-20T12:25:40.104192
MEAN_MOTION    = 15.72125391
ECCENTRICITY   = .0006703
INCLINATION    = 51.6416
RA_OF_ASC_NODE = 247.4627
ARG_OF_PERICENTER = 130.536
MEAN_ANOMALY   = 325.0288

EPHEMERIS_TYPE = 0
CLASSIFICATION_TYPE = U
NORAD_CAT_ID   = 25544
ELEMENT_SET_NO = 292
REV_AT_EPOCH   = 56353
BSTAR          = -.11606E-4
MEAN_MOTION_DOT = -.2182E-4
MEAN_MOTION_DDOT = -.1E-4
```

# Verification
---
It is important to me that mako-sgp4 is accurate. The code is tested against standard Vallado test cases and additional test cases generated with [python-sgp4](https://github.com/brandon-rhodes/python-sgp4). In every case, it agrees with the reference SGP4 implementation to within 1 mm in position and 1 mm/s in velocity, per component. The test suite enforces that tolerance in every future version.

# What's Next
---
The next major feature is the reverse problem: fitting a GP element set to a series of state vectors. Given the positions and velocities from GPS or a high-fidelity propagator, the goal is to find the TLE/OMM whose SGP4 propagation best matches them. I also plan to add a Python wrapper.
