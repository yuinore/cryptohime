require "erb"
require "rmagick"
include Magick

TILE_OPACITY = 0.4

sz = 16
images = []

######## Resizing
["01", "02", "03", "04"].each do |file_id|
  image = Image.read("tools/#{file_id}.png").first

  image = image.resize_to_fit(640, 720)
  image = image.crop(CenterGravity, image.columns / sz * sz, image.rows / sz * sz)

  images << image
  image.write("tools/#{file_id}_small.png")
end

######## Basic Variables
transparent_color = Pixel.new(0, 0, 0, QuantumRange)
w = images[0].columns
h = images[0].rows
cols = w / sz
rows = h / sz
tile = Image.read("tools/img/tile.png").first
tile = tile.blend(tile, TILE_OPACITY, 0) # change tile opacity
transparent_tile = tile.blend(tile, 0, 0)

######## Key Determination
def select_a_key(modulo)
  # avoid 1 and (modulo - 1)
  (2..(modulo - 2)).to_a.shuffle.find { |x| x.gcd(modulo) == 1 }
end

# gcd(cols, key1) == 1
# gcd(rows, key2) == 1
# gcd(cols * rows, key3[i]) == 1 for all i
key1 = select_a_key(cols)
key2 = select_a_key(rows)
key3 = [
  select_a_key(cols * rows),
  select_a_key(cols * rows),
  select_a_key(cols * rows),
]
puts "key1 = #{key1}"
puts "key2 = #{key2}"
puts "key3 = #{key3.inspect}"

######## Generate Block Table
blks = []

[0, 2].each do |image_i|
  blk = Array.new(cols * rows, false)

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
  withblock.write("tools/#{image_id1}_withblock.png")
  masked.write("tools/#{image_id2}_masked.png")
end

######## shuffle tiles
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
  "tools/01_withblock.png",
  "tools/02_masked.png",
  "tools/03_withblock.png",
  "tools/04_masked.png",
]
outfilenames = [
  "www/img/01-fuku.png",
  "www/img/01-bg.png",
  "www/img/02-fuku.png",
  "www/img/02-bg.png",
]

originals.each_with_index do |original, image_i|
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

  shuf.write("tools/#{File.basename(original, ".*")}_shuffled.png") # FIXME:
  shuf.write(outfilenames[image_i])
end

######## blockmap Encoding
def blockmap_encode(data)
  str = ""
  chr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789$_"
  0.step(data.length - 1, 6) do |i|
    str += chr[
      (data[i + 0] ? 32 : 0) |
      (data[i + 1] ? 16 : 0) |
      (data[i + 2] ?  8 : 0) |
      (data[i + 3] ?  4 : 0) |
      (data[i + 4] ?  2 : 0) |
      (data[i + 5] ?  1 : 0)
    ];
  end

  str = str.gsub(/A{2,9}/) { |x| (38 + x.size).chr } # 「A」2～9 文字の連長 →「()*+,-./」の順で１文字化
  str = str.gsub(/_{2,8}/) { |x| (56 + x.size).chr } # 「_」2～8 文字の連長 →「:;<=>?@」 の順で１文字化

  str
end

blockmaps = []

blks.each do |blk|
  blockmap = blockmap_encode(blk)
  blockmaps << blockmap
  p blockmap
end

######## Convert index.html

erb_filenames = [
  "index.html.erb",
  "hime.js.erb",
]

erb_filenames.each do |erb_filename|
  erb = File.read("hime/#{erb_filename}")

  erb_params = {
    title: "Title Here",
    image_width: 512,
    image_height: 720,
    paddle_margin_above: 0,
    paddle_margin_below: 80,
    key1: key1,
    key2: key2,
    key3: key3.inspect,
    nums: (1..blockmaps.size).to_a.map { |i| format("%02d", i) },
    blockmaps: blockmaps,
  }

  result = ERB.new(erb).result_with_hash(erb_params)

  File.write("www/#{File.basename(erb_filename, ".erb")}", result)
end
