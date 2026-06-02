# Lesson 01 — CV Fundamentals

Welcome to lesson one. By the end of this lesson you'll be comfortable thinking
about images as tensors, manipulating them with OpenCV, and reasoning about
what a convolution actually *does* to those tensors. You'll also have built two
small functions yourself (`gaussian_blur` and `compute_iou`) and explored Canny
edge detection in the Playground.

Three things to keep in mind:

- The Playground is your sandbox. Try things in there before formalising them
  in the exercises.
- The exercises are short. Each one is one function — don't reach for libraries
  unless the hint suggests it.
- Read OpenCV documentation as a habit. The OpenCV docs are dense but the
  reference is the source of truth for every shape and dtype.

---

## What is an image?

An image is just a 3-D array of numbers. For a colour image of height `H` and
width `W` with three channels, the tensor has shape:

- **`(H, W, C)`** — the convention used by OpenCV, PIL, NumPy, and almost
  every library that touches raw pixel data on disk.
- **`(C, H, W)`** — the convention used by PyTorch and most deep-learning
  frameworks. The channel axis comes first so the GPU can stride efficiently.

Most of the bugs you'll write in your first month doing CV come from getting
this wrong. When in doubt, print the shape:

```python
import cv2
img = cv2.imread('cat.png')          # (H, W, 3)  BGR uint8
print(img.shape, img.dtype)          # e.g. (384, 512, 3) uint8
```

OpenCV reads in **BGR** order (not RGB) for historical reasons. If you display
an OpenCV image through matplotlib without converting, the cat will look blue.

```python
rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
```

Pixel values are usually 8-bit unsigned integers in `[0, 255]`. When you feed
images into a neural network you almost always want to normalise to `float32`
in `[0, 1]` first:

```python
x = img.astype('float32') / 255.0    # still (H, W, 3), but floats
```

---

## OpenCV basics

The four operations you'll use most:

```python
img = cv2.imread('image.png')                 # load (BGR)
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)  # 3 -> 1 channel
small = cv2.resize(img, (256, 256))           # note: (width, height) order
cv2.imwrite('out.png', small)                 # save
```

A few sharp edges that will bite you exactly once:

- `cv2.resize(img, (W, H))` takes width first, but `img.shape` returns
  `(H, W, …)`. They're inconsistent on purpose; just memorise it.
- `cv2.imread` returns `None` on missing files instead of raising. Always check
  `if img is None: raise FileNotFoundError(path)`.
- Grayscale conversion drops the channel axis: shape goes from `(H, W, 3)` to
  `(H, W)`. Many subsequent operations care.

---

## Convolutions

A convolution slides a small grid of numbers — the **kernel** — over the image.
At every position, it multiplies the kernel against the local pixel
neighbourhood and sums the result. That sum becomes the new pixel value.

The kernel shape decides what feature gets emphasised. A kernel that's
positive everywhere produces a **blur** (each output pixel is a weighted
average of its neighbours). A kernel with positive and negative regions can
emphasise edges, corners, or specific orientations.

Slide the slider below to see how kernel size changes the blur. With kernel 1
the image is unchanged; with kernel 11 it's smeared significantly.

<ConvolutionDemo />

For a Gaussian blur specifically, the kernel weights follow a 2-D Gaussian
distribution — centre pixels weigh more than corner pixels. Here's a 1-D
slice of that weighting at various sigmas:

<KernelVisualizer />

In code, you can build a Gaussian kernel and convolve manually:

```python
import cv2

k = 5  # must be odd
kernel_1d = cv2.getGaussianKernel(k, 0)       # shape (5, 1), sums to 1
kernel_2d = kernel_1d @ kernel_1d.T           # shape (5, 5), sums to 1
blurred = cv2.filter2D(img, -1, kernel_2d)
```

…or just let OpenCV do both steps in one call:

```python
blurred = cv2.GaussianBlur(img, (5, 5), 0)    # equivalent result
```

**Exercise 1** asks you to build the kernel and convolve yourself — the
first version above. Doing it once by hand makes everything that follows
(edge detectors, feature maps, ConvNets) less mysterious.

---

## Edge detection

An *edge* in an image is a place where pixel intensity changes sharply. The
Canny edge detector — the standard "give me the edges" tool — works in four
stages:

1. **Blur** the image slightly to suppress noise (otherwise every speckle
   becomes an edge).
2. **Compute the gradient** at every pixel: how much does intensity change
   moving left-right, and how much moving up-down? This gives a gradient
   magnitude and direction per pixel.
3. **Non-max suppression**: only keep the gradient peaks. A thick blurry edge
   gets thinned down to a 1-pixel ridge.
4. **Hysteresis thresholding**: pixels above a `high_threshold` are
   definitely edges. Pixels below a `low_threshold` definitely aren't.
   Pixels in between are edges only if they connect to a high-threshold pixel.

The two thresholds are the only knobs you get, and they're the source of
every "why is Canny missing this edge" problem. Tuning them is exercise 3.

```python
import cv2

img = cv2.imread('street.png')
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
edges = cv2.Canny(gray, threshold1=50, threshold2=150)
```

A useful rule of thumb: keep `threshold2` roughly 2–3× `threshold1`. Setting
both too low produces a "snowstorm" of false edges; both too high and you
lose real edges.

---

## What's next

You've now seen enough to start the exercises. Head to:

- **Playground** to try `opencv_blur` and `opencv_edge` on the bundled cat
  and street images, or upload your own.
- **Exercises** to:
  1. Implement `gaussian_blur` (fill in the two blanks).
  2. Implement `compute_iou` from scratch.
  3. Tune Canny thresholds in the Playground and reflect on what changes.
- **Progress** to track your auto-tests and tick off the self-check list.

Good luck. Don't peek at solutions before trying yourself for at least ten
minutes — the muscle you're building is "I can fail at this and recover," and
that only happens if you actually fail first.
