---
title:      "information entropy"
date:       2020-11-27T10:48:02-05:00
lastmod:    2025-01-22T16:14:00-05:00
draft:      false
---

{{< katex >}}

*This article was originally published on March 19, 2014 in correspondence with a talk I gave*

### Introduction

After one late night attempting to explain the laws of information entropy, I decided to write an article to sum it up (literally).

We usually hear about entropy in regards to physics, in which it describes how random a physical system is. Newton’s Second Law of Thermodynamics states that a system’s entropy increases over time naturally, meaning that randomness is increased. Information entropy is a little different than physical entropy, though there are related aspects. Information entropy describes how random the information is, though its entropy does not naturally increase over time. Information entropy was first described by Claude Shannon in 1948.

### Equation

Shannon’s entropy equation is as follows:

$$ H(X) = -\sum_{i=1}^{n} p(x_i) \log_2 p(x_i) $$

where p(x) is the probability of a particular byte and n is the probability space. In the case of computer data, the maximum probability space is n = 256 because there are 256 possible bytes - 0x00 to 0xFF in hex. In practical applications, n can be smaller if a particular byte is not present within the information being calculated.

###  Examples

Let’s simplify: what’s the entropy of a fair coin toss? This is calculated as:

$$ p(x(heads)) = 50\\% = 0.5, p(x(tails)) = 50\\% = 0.5$$
$$  $$
$$ -[ p(x(heads))] \log_2 p(x(heads)) + p(x(tails))] \log_2 p(x(tails)) ] $$
$$ -[ (0.5) \log_2 0.5 + (0.5) \log_2 0.5 ] $$
$$ -[ -0.5 + -0.5 ] $$
$$ -[-1] $$
$$ 1 $$

So the answer is 1. What does this mean? In full terms, it means that the amount of information retrieved from a fair coin flip is 1 bit of information per 1 bit of information, and this measurement verifies that the coin’s probability of outcomes is indeed fair. The coin is as random as it can be -  there isn’t anything more random than 50/50 with a coin flip.

Let’s decrease the randomness of a coin flip by making the coin unfair by increasing the chance of heads to 75%:

$$ p(x(heads)) = 75\\% = 0.75, p(x(tails)) = 25\\% = 0.25$$
$$  $$
$$ -[ p(x(heads))] \log_2 p(x(heads)) + p(x(tails))] \log_2 p(x(tails)) ] $$
$$ -[ (0.75) \log_2 0.75 + (0.25) \log_2 0.25 ] $$
$$ -[ \approx -0.311 + -0.5 ] $$
$$ -[ \approx -0.811 ] $$
$$ [ \approx 0.811 $$

The entropy for this unfair coin toss is around 0.811, meaning that the amount of information retrieved from this unfair coin is around 0.811 bits of information per 1 bit of information. If the probability of heads in increased to 90%, that unfair coin has an even lower entropy than 0.811 bits per bit. Following this trend, as information becomes less random, its entropy becomes smaller relative to the amount of bits per unit of information. A coin with heads on both sides always lands heads and its entropy is exactly zero, meaning that no useful information is conveyed with this kind of coin flip.

### Practicality

So calculating the entropy of a fair and unfair coin is interesting, but what practical uses does entropy have, you say? Cryptography algorithms increase entropy of unencrypted data by obscuring it such that without a decryption key, the encrypted information appears more random than the unencrypted information. Compression algorithms decrease the entropy of a file by removing redundant, less random data to lower the file’s size. In fact, from a computational complexity perspective, the amount of entropy of uncompressed data details the mathematical lower bound, which is the best any compression algorithm could ever hope to achieve. In computer and network security, high entropy data may indicate a malicious program trying to mask itself through encryption or obsufcation and low entropy data may indicate a non-compliance of an applied encryption security program, though each scenario depends on the environment and how its used.

### As Code

To calculate the entropy of a file, it must be read byte by byte. Each occurrence of a byte is added to a frequency array to keep track of how often a byte occurs. After the entire file is read, the frequency array is used to calculate the file’s entropy by summing each byte’s possibility multiplied by the logarithm of its possibility, and then the result is multiplied by negative one - Shannon’s entropy equation.

The snippet of code that performs the entropy calculation is:

```java
double entropy = 0;
for(int i=0;i<frequency_array.length;i++) {
  if(frequency_array[i]!=0) {
    // calculate the probability of a particular byte occuring
    double probabilityOfByte=(double)frequency_array[i]/(double)fileContentLength;
    
    // calculate the next value to sum to previous entropy calculation
    double value = probabilityOfByte * (Math.log(probabilityOfByte) / Math.log(2));
    entropy += value;
  }
}
entropy *= -1;
```

To see entire source code in Java that calculates the entropy of a file at a given file path, take a look at https://github.com/willjasen/entropy - ![GitHub last commit](https://img.shields.io/github/last-commit/willjasen/entropy)

As a neat side note, the digital forensics tool [The Sleuth Kit](https://www.sleuthkit.org/) incorporated my entropy code into their [encryption detection](https://www.sleuthkit.org/autopsy/docs/api-docs/4.9.0/_encryption_detection_tools_8java_source.html) module!

And there you have it!

![Entropy](/posts/entropy.gif)

### Sources

- http://en.wikipedia.org/wiki/Entropy_(information_theory)
- http://examples.javacodegeeks.com/core-java/io/fileinputstream/read-file-in-byte-array-with-fileinputstream/
