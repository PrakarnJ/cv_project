# Lesson 02 — CNNs + Image Classification

Welcome to lesson two. In lesson one you saw what an image *is* (a tensor)
and what a convolution *does* (slide a kernel and sum). Lesson two answers
the next question: how do we stack convolutions into something that takes
a photo and says **"that's a golden retriever, 87% confident"**?

You won't train a network from scratch — that takes a million labeled
images and a GPU-hour or three. Instead you'll use two pre-trained ImageNet
classifiers from `torchvision`, learn the input pipeline they expect, and
build the metric (top-K accuracy) used to score them.

---

## 1. From hand-crafted features to learned ones

In lesson one you wrote a Gaussian blur and a Canny edge detector. Those
are two filters someone else figured out: their kernels are hand-derived.
They work for "make blurry" and "find edges," but if you want a filter
that fires on *dog ears* or *steering wheels*, you can't write that down.

A **convolutional neural network** doesn't ask you to. It stacks dozens or
hundreds of filters and learns their values from data. Early layers end
up looking like edge detectors (we know this because we've inspected
them); deeper layers respond to textures, parts, then whole objects.

---

## 2. Anatomy of a CNN classifier

A typical ImageNet classifier looks like:

```
input (3, 224, 224)
  └─ conv + ReLU + (optional) batchnorm    ─┐
  └─ conv + ReLU + ...                       │  feature extractor
  └─ pool (downsample by 2)                  │  (stacked many times)
  └─ ... more conv/pool ...                 ─┘
  └─ global average pool        (final feature vector, ~512 or 1280 dims)
  └─ fully-connected layer      (1000 outputs — one per ImageNet class)
  └─ softmax                    (turns logits into probabilities)
```

Each conv layer is doing the same operation as lesson-01's `filter2D`,
just with thousands of kernels and learned weights. Pooling halves the
spatial resolution so deeper layers can see larger patterns.

`ResNet-18` and `MobileNet V3 Small` (the two models registered in this
lesson's playground) follow this shape. ResNet-18 has ~11M parameters;
MobileNet V3 Small has ~2.5M — about 4x smaller, designed for phones.

---

## 3. ImageNet and pre-trained models

"ImageNet" usually means the **ImageNet-1K** dataset: 1.28 million training
images across 1000 classes. The classes are oddly specific (`golden
retriever`, `Shih-Tzu`, `tench`, `chain-link fence`) and famously
quirky — there is no `human` class, but there are 120 dog breeds.

`torchvision.models` ships with weights pre-trained on ImageNet-1K. You
get a working classifier with three lines:

```python
from torchvision.models import resnet18, ResNet18_Weights
weights = ResNet18_Weights.IMAGENET1K_V1
model = resnet18(weights=weights).eval()
```

That's the model. Now the input — which is where most beginner code breaks.

---

## 4. The ImageNet preprocessing recipe

Every torchvision ImageNet model expects the **same four-step input
pipeline**. Skip a step and the model returns garbage predictions — not
an error, just nonsense.

1. **Convert color order**: OpenCV reads images as BGR; torchvision
   expects RGB. `cv2.cvtColor(image, cv2.COLOR_BGR2RGB)`.

2. **Resize so the SHORTER side is 256**, keeping aspect ratio. A
   1920×1080 image becomes ~455×256. A 100×200 image becomes 256×512.
   The longer side is whatever it ends up being.

3. **Center-crop to 224×224**. This is the actual input size. The
   resize-then-crop two-step is what gives you a square input without
   distorting the aspect ratio.

4. **Normalize**: convert uint8 [0, 255] to float32 [0, 1], then
   `(x - mean) / std` per channel, with
   `mean = [0.485, 0.456, 0.406]`, `std = [0.229, 0.224, 0.225]`. These
   are the per-channel mean and std of the ImageNet training set; using
   them puts new images on the same scale the model trained on.

Finally, shape the tensor as `(batch, channels, height, width) =
(1, 3, 224, 224)` because PyTorch models process batches, even a batch
of one.

torchvision's `weights.transforms()` does all of this in one line.
**Exercise 1** asks you to build it from scratch so you understand each
step.

---

## 5. Reading top-K predictions

The classifier's output is 1000 numbers — one **logit** per ImageNet class.
Run `softmax` over them to get probabilities that sum to 1:

```python
probs = torch.nn.functional.softmax(logits, dim=-1)
scores, indices = torch.topk(probs, k=5)
```

The result is the top-5 most likely classes, plus their probabilities.
For a clear shot of a cat, you might see:

```
1. Egyptian cat            0.42
2. tabby                   0.31
3. tiger cat               0.18
4. lynx                    0.06
5. cougar                  0.01
```

The top-1 may be wrong (it's a tabby), but the answer is in the top-3.
That's why **top-K accuracy** is the standard ImageNet metric — it gives
partial credit for "close enough."

**Exercise 2** asks you to implement top-K accuracy from scratch. It's a
one-liner with NumPy broadcasting, but the broadcasting trick is worth
internalizing — you'll see it again.

---

## A note on the bundled sample images

The `cat.png` and `street.png` in this lesson's `assets/` folder are
*illustrations*, not photographs. Try running ResNet-18 on `cat.png` — the
top-5 will look bizarre (you'll get things like "pinwheel" and "traffic
light"). That isn't a bug. ImageNet was trained on real photographs, so
the model has effectively never seen a flat-shaded cartoon during
training. The phenomenon has a name: **distribution shift** (sometimes
called domain shift). It's one of the most common reasons real-world
classifiers fail in production.

For meaningful predictions, **upload your own photos** via the file picker
in the Playground — a real photo of an animal, a vehicle, a household
object. The classes are listed in
[the ImageNet-1K class list](https://github.com/pytorch/hub/blob/master/imagenet_classes.txt)
if you want to aim for known-good labels.

---

## Next steps

Switch to the **Playground** tab — start with the bundled illustration
(see the note above), then upload a real photo and watch the predictions
shift. Work through the three exercises:

- **Exercise 1** — implement `preprocess_for_imagenet` (fill in two blanks).
- **Exercise 2** — implement `top_k_accuracy` from scratch.
- **Exercise 3** — compare ResNet-18 vs MobileNet V3 in the playground,
  find a disagreement, and reflect on it.
