require 'rmagick'
include Magick

TILE_OPACITY = 0.4

sz = 16
images = []

######## Resizing
["01", "02", "03", "04"].each do |file_id|
  image = Image.read("#{file_id}.png").first

  image = image.resize_to_fit(640, 720)
  image = image.crop(CenterGravity, image.columns / sz * sz, image.rows / sz * sz)

  images << image
  image.write("#{file_id}_small.png")
  image.crop(0, 0, image.columns, image.rows).write("#{file_id}_small_crop.png")
end

######## Basic Variables
transparent_color = Pixel.new(0, 0, 0, QuantumRange)
w = images[0].columns
h = images[0].rows
cols = w / sz
rows = h / sz
tile = Image.read("img/tile.png").first
tile = tile.blend(tile, TILE_OPACITY, 0) # change tile opacity
transparent_tile = tile.blend(tile, 0, 0)

######## Generate Block Table
blks = []

[0, 2].each do |image_i|
  blk = Array.new(h * w, false)

  diff = images[image_i].composite(images[image_i + 1], 0, 0, DifferenceCompositeOp)
  (0...w / sz).each do |x|
    (0...h / sz).each do |y|
      (0...sz).each do |i|
        (0...sz).each do |j|
          color = diff.pixel_color(x * sz + i, y * sz + j)

          if ([color.red, color.green, color.blue] != [0, 0, 0])
            blk[y * cols + x] = true
            break
          end
        end
      end
    end
  end

  blks << blk
end

######## Composite Tile Graphics
######## and Mask Second Image
[["01", "02", 0, 1], ["03", "04", 2, 3]].each do |image_id1, image_id2, image_i1, image_i2|
  withblock = images[image_i1]
  masked = images[image_i2]
  (0...w / sz).each do |x|
    (0...h / sz).each do |y|
      if blks[image_i1 / 2][y * cols + x]
        withblock = withblock.composite(tile, x * sz, y * sz, AtopCompositeOp)
      else
        masked = masked.composite(transparent_tile, x * sz, y * sz, CopyCompositeOp)
      end
    end
  end
  withblock.write("#{image_id1}_withblock.png")
  masked.write("#{image_id2}_masked.png")
end

######## shuffle tiles
key1 = 9            # gcd(w, key1) == 1
key2 = 13           # gcd(h, key2) == 1
key3 = [59, 23, 31] # gcd(w * h, key3[i]) == 1 for all i

def bitshuffle(n, modulo)
  # FIXME: n must be <2^14
  subtotal = 0
  14.downto(0) do |bit|
    if ((modulo & (1 << bit)) != 0)
      if (n < subtotal + (1 << bit))
        n2 = subtotal
        (0...bit).each do |bit2|
          n2 += (((n >> (bit - bit2 - 1)) & 1) << bit2)
        end

        return n2
      end
      subtotal += (1 << bit)
    end
  end

  raise "Bitshuffle Error"
end

originals = [
  "01_withblock.png",
  "02_masked.png",
  "03_withblock.png",
  "04_masked.png",
]

originals.each do |original|
  orig = Image.read(original).first
  shuf = Image.new(w, h) do
    self.background_color = Pixel.new(0, QuantumRange, 0, 0) #transparent_color
  end

  (0...w / sz).each do |x|
    (0...h / sz).each do |y|
      z = y * cols + x
      z = (z * key3[0]) % (cols * rows)
      z = bitshuffle(z, cols * rows)
      z = (z * key3[1]) % (cols * rows)
      z = bitshuffle(z, cols * rows)
      z = (z * key3[2]) % (cols * rows)
      z = bitshuffle(z, cols * rows)
      x2 = z % cols
      y2 = z / cols
      x2 = (x2 * key1) % cols
      y2 = (y2 * key2) % rows

      #iportion = orig.crop(x * sz + 1, y * sz, sz, sz) # nazeka 1px zureru
      #shuf = shuf.composite(portion, x2 * sz, y2 * sz, AtopCompositeOp)

      (0...sz).each do |i|
        (0...sz).each do |j|
          color = orig.pixel_color(x * sz + i, y * sz + j)
          shuf.pixel_color(x2 * sz + i, y2 * sz + j, color)
        end
      end
    end
  end

  shuf.write("#{File.basename(original, ".*")}_shuffled.png")
end
